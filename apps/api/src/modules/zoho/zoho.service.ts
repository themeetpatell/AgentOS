import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ZohoCreateResponse,
  ZohoDeal,
  ZohoLead,
  ZohoModule,
  ZohoNote,
  ZohoSearchResult,
  ZohoTask,
} from './zoho.types';

interface ZohoConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly refreshToken: string;
  readonly apiBase: string;
  readonly accountsBase: string;
}

interface CachedToken {
  readonly accessToken: string;
  readonly expiresAt: number;
}

interface CachedRecord<T> {
  readonly value: T;
  readonly expiresAt: number;
}

const TOKEN_BUFFER_MS = 30_000;
const RECORD_CACHE_MS = 5 * 60_000;

@Injectable()
export class ZohoService {
  private readonly logger = new Logger(ZohoService.name);
  private readonly cfg: ZohoConfig;
  private token: CachedToken | null = null;
  private readonly leadCache = new Map<string, CachedRecord<ZohoLead>>();
  private readonly dealCache = new Map<string, CachedRecord<ZohoDeal>>();

  constructor(config: ConfigService) {
    this.cfg = {
      clientId: config.get<string>('app.zoho.clientId') ?? '',
      clientSecret: config.get<string>('app.zoho.clientSecret') ?? '',
      refreshToken: config.get<string>('app.zoho.refreshToken') ?? '',
      apiBase:
        config.get<string>('app.zoho.apiBase') ?? 'https://www.zohoapis.com',
      accountsBase:
        config.get<string>('app.zoho.accountsBase') ??
        'https://accounts.zoho.com',
    };
  }

  isConfigured(): boolean {
    return Boolean(
      this.cfg.clientId && this.cfg.clientSecret && this.cfg.refreshToken,
    );
  }

  // -------- Reads --------

  async getLead(id: string): Promise<ZohoLead | null> {
    const cached = this.leadCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    const data = await this.fetchRecord<ZohoLead>('Leads', id);
    if (data) {
      this.leadCache.set(id, { value: data, expiresAt: Date.now() + RECORD_CACHE_MS });
    }
    return data;
  }

  async getDeal(id: string): Promise<ZohoDeal | null> {
    const cached = this.dealCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    const data = await this.fetchRecord<ZohoDeal>('Deals', id);
    if (data) {
      this.dealCache.set(id, { value: data, expiresAt: Date.now() + RECORD_CACHE_MS });
    }
    return data;
  }

  async searchLeads(q: string): Promise<ZohoSearchResult[]> {
    const items = await this.searchModule<ZohoLead>('Leads', q);
    return items.map((l) => ({
      type: 'lead' as const,
      id: l.id,
      title:
        l.Full_Name ??
        [l.First_Name, l.Last_Name].filter(Boolean).join(' ') ||
        l.Email ||
        l.id,
      subtitle: [l.Email, l.Company].filter(Boolean).join(' · '),
    }));
  }

  async searchDeals(q: string): Promise<ZohoSearchResult[]> {
    const items = await this.searchModule<ZohoDeal>('Deals', q);
    return items.map((d) => ({
      type: 'deal' as const,
      id: d.id,
      title: d.Deal_Name ?? d.id,
      subtitle: [d.Stage, d.Account_Name?.name].filter(Boolean).join(' · '),
    }));
  }

  // -------- Writes --------

  async createNote(input: {
    parentModule: ZohoModule;
    parentId: string;
    title: string;
    content: string;
  }): Promise<ZohoNote> {
    const body = {
      data: [
        {
          Note_Title: input.title.slice(0, 120),
          Note_Content: input.content.slice(0, 32000),
          Parent_Id: input.parentId,
          se_module: input.parentModule,
        },
      ],
    };
    const res = await this.callZoho('POST', '/crm/v6/Notes', body);
    const json = (await res.json()) as ZohoCreateResponse;
    const first = json.data?.[0];
    if (!first || first.status !== 'success' || !first.details.id) {
      throw new ServiceUnavailableException(
        `Zoho createNote failed: ${first?.code ?? 'unknown'} ${first?.message ?? ''}`,
      );
    }
    return {
      id: first.details.id,
      Note_Title: input.title,
      Note_Content: input.content,
      Parent_Id: { id: input.parentId, module: input.parentModule },
    };
  }

  async createTask(input: {
    parentModule: ZohoModule;
    parentId: string;
    subject: string;
    dueDate?: string;
    description?: string;
  }): Promise<ZohoTask> {
    const body = {
      data: [
        {
          Subject: input.subject.slice(0, 200),
          Status: 'Not Started',
          Priority: 'Normal',
          Due_Date: input.dueDate,
          Description: input.description?.slice(0, 2000),
          What_Id: input.parentId,
          $se_module: input.parentModule,
        },
      ],
    };
    const res = await this.callZoho('POST', '/crm/v6/Tasks', body);
    const json = (await res.json()) as ZohoCreateResponse;
    const first = json.data?.[0];
    if (!first || first.status !== 'success' || !first.details.id) {
      throw new ServiceUnavailableException(
        `Zoho createTask failed: ${first?.code ?? 'unknown'} ${first?.message ?? ''}`,
      );
    }
    return {
      id: first.details.id,
      Subject: input.subject,
      Status: 'Not Started',
      Priority: 'Normal',
      Due_Date: input.dueDate,
      Description: input.description,
      What_Id: { id: input.parentId, name: '' },
    };
  }

  /** Deep link a Zoho record into the user's Zoho UI. */
  recordUrl(module: ZohoModule, id: string): string {
    return `https://crm.zoho.com/crm/tab/${module}/${id}`;
  }

  // -------- Internals --------

  private async fetchRecord<T extends { id: string }>(
    module: ZohoModule,
    id: string,
  ): Promise<T | null> {
    const res = await this.callZoho('GET', `/crm/v6/${module}/${id}`);
    if (res.status === 204 || res.status === 404) {
      return null;
    }
    const json = (await res.json()) as { data?: ReadonlyArray<T> };
    return json.data?.[0] ?? null;
  }

  private async searchModule<T extends { id: string }>(
    module: ZohoModule,
    q: string,
  ): Promise<ReadonlyArray<T>> {
    if (!q.trim()) return [];
    const params = new URLSearchParams({ word: q, per_page: '10' });
    const res = await this.callZoho(
      'GET',
      `/crm/v6/${module}/search?${params}`,
    );
    if (res.status === 204) return [];
    const json = (await res.json()) as { data?: ReadonlyArray<T> };
    return json.data ?? [];
  }

  private async callZoho(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<Response> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Zoho is not configured (set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN)',
      );
    }

    const doCall = async (token: string): Promise<Response> =>
      fetch(`${this.cfg.apiBase}${path}`, {
        method,
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

    let token = await this.accessToken();
    let res = await doCall(token);
    if (res.status === 401) {
      this.token = null;
      token = await this.accessToken();
      res = await doCall(token);
    }
    if (!res.ok && res.status !== 204 && res.status !== 404) {
      const text = await safeText(res);
      throw new ServiceUnavailableException(
        `Zoho ${method} ${path} failed: ${res.status} ${res.statusText} ${text}`,
      );
    }
    return res;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + TOKEN_BUFFER_MS) {
      return this.token.accessToken;
    }
    const params = new URLSearchParams({
      refresh_token: this.cfg.refreshToken,
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
      grant_type: 'refresh_token',
    });
    const res = await fetch(`${this.cfg.accountsBase}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) {
      const text = await safeText(res);
      throw new ServiceUnavailableException(
        `Zoho token refresh failed: ${res.status} ${res.statusText} ${text}`,
      );
    }
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) {
      throw new ServiceUnavailableException(
        'Zoho token response missing access_token',
      );
    }
    this.token = {
      accessToken: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return this.token.accessToken;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

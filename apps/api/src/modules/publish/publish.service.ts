import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AgentId, AgentRun, Brief } from '@finanshels-neuro/shared';
import { ZohoPublishAdapter } from './zoho-publish.adapter';

export interface PublishResult {
  readonly destination: 'finanshels-web' | 'zoho' | 'noop';
  readonly externalId?: string;
  readonly url?: string;
}

const SALES_AGENTS: ReadonlySet<AgentId> = new Set<AgentId>([
  'cold-outreach',
  'follow-up',
  'discovery-prep',
]);

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly zohoAdapter: ZohoPublishAdapter,
  ) {}

  /**
   * Push an approved run's draft to the destination matching the agent type:
   * - sales agents -> Zoho Note + Task on the matching Lead/Deal
   * - marketing agents -> finanshels_web CMS hook
   * Returns 'noop' if the relevant destination isn't configured.
   * Throws if the run isn't APPROVED or has no draft.
   */
  async publish(run: AgentRun, brief: Brief): Promise<PublishResult> {
    if (run.status !== 'APPROVED') {
      throw new BadRequestException(
        `Run ${run.id} is not APPROVED (status: ${run.status})`,
      );
    }
    if (!run.draft) {
      throw new BadRequestException(`Run ${run.id} has no draft to publish`);
    }

    if (SALES_AGENTS.has(run.agentId)) {
      return this.zohoAdapter.publish(run, brief);
    }
    return this.publishToWeb(run);
  }

  private async publishToWeb(run: AgentRun): Promise<PublishResult> {
    const url =
      this.config.get<string>('app.publish.finanshelsWebUrl') ??
      process.env.FINANSHELS_WEB_PUBLISH_URL ??
      '';
    const token =
      this.config.get<string>('app.publish.finanshelsWebToken') ??
      process.env.FINANSHELS_WEB_PUBLISH_TOKEN ??
      '';

    if (!url) {
      this.logger.warn(
        `FINANSHELS_WEB_PUBLISH_URL not set; publish for run ${run.id} is a no-op`,
      );
      return { destination: 'noop' };
    }

    const draft = run.draft!;
    const payload = {
      runId: run.id,
      agentId: run.agentId,
      title: draft.title,
      body: draft.body,
      seoTitle: draft.seoTitle,
      metaDescription: draft.metaDescription,
      status: 'draft' as const,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await safeText(res);
      throw new ServiceUnavailableException(
        `Publish hook failed: ${res.status} ${res.statusText} ${text}`,
      );
    }

    const body = (await safeJson(res)) as
      | { externalId?: string; url?: string }
      | null;
    return {
      destination: 'finanshels-web',
      externalId: body?.externalId,
      url: body?.url,
    };
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

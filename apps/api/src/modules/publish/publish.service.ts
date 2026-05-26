import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AgentRun } from '@finanshels-neuro/shared';

export interface PublishResult {
  readonly destination: 'finanshels-web' | 'noop';
  readonly externalId?: string;
  readonly url?: string;
}

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Push an approved run's draft to the finanshels_web CMS as a draft post.
   * Returns 'noop' if the publish hook isn't configured (local dev / no CMS).
   * Throws if the run isn't APPROVED or has no draft.
   */
  async publish(run: AgentRun): Promise<PublishResult> {
    if (run.status !== 'APPROVED') {
      throw new BadRequestException(
        `Run ${run.id} is not APPROVED (status: ${run.status})`,
      );
    }
    if (!run.draft) {
      throw new BadRequestException(`Run ${run.id} has no draft to publish`);
    }

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

    const payload = {
      runId: run.id,
      agentId: run.agentId,
      title: run.draft.title,
      body: run.draft.body,
      seoTitle: run.draft.seoTitle,
      metaDescription: run.draft.metaDescription,
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

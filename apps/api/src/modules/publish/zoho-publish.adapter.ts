import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { AgentRun, Brief } from '@finanshels-neuro/shared';
import { ZohoService } from '../zoho/zoho.service';
import type { ZohoModule } from '../zoho/zoho.types';
import type { PublishResult } from './publish.service';

@Injectable()
export class ZohoPublishAdapter {
  private readonly logger = new Logger(ZohoPublishAdapter.name);

  constructor(private readonly zoho: ZohoService) {}

  /**
   * Publish a sales-agent draft to Zoho as a Note on the matching Lead/Deal,
   * plus a Task reminding the rep to send the email tomorrow. Returns 'noop'
   * if Zoho isn't configured or the brief carries no CRM ref.
   */
  async publish(run: AgentRun, brief: Brief): Promise<PublishResult> {
    if (!run.draft) {
      throw new BadRequestException(`Run ${run.id} has no draft to publish`);
    }
    if (!this.zoho.isConfigured()) {
      this.logger.warn(
        `Zoho not configured; publish for run ${run.id} is a no-op`,
      );
      return { destination: 'noop' };
    }

    const target = resolveTarget(brief);
    if (!target) {
      this.logger.warn(
        `Brief ${brief.id} has no leadId/dealId; publish for run ${run.id} is a no-op`,
      );
      return { destination: 'noop' };
    }

    const noteTitle = `[${run.agentId}] ${run.draft.title}`.slice(0, 120);
    const noteContent = renderNoteContent(run);

    const note = await this.zoho.createNote({
      parentModule: target.module,
      parentId: target.id,
      title: noteTitle,
      content: noteContent,
    });

    // Best-effort task creation; if it fails we keep the Note and warn.
    try {
      await this.zoho.createTask({
        parentModule: target.module,
        parentId: target.id,
        subject: `Send ${run.agentId} draft to lead`,
        dueDate: nextBusinessDayIso(),
        description: `Draft is in note ${note.id}. Review at ${runUrl(run.id)} before sending.`,
      });
    } catch (err: unknown) {
      this.logger.warn(
        `Zoho task creation failed for run ${run.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      destination: 'zoho',
      externalId: note.id,
      url: this.zoho.recordUrl(target.module, target.id),
    };
  }
}

interface CrmTarget {
  readonly module: ZohoModule;
  readonly id: string;
}

function resolveTarget(brief: Brief): CrmTarget | null {
  if (!brief.context) return null;
  if (brief.context.leadId) {
    return { module: 'Leads', id: brief.context.leadId };
  }
  if (brief.context.dealId) {
    return { module: 'Deals', id: brief.context.dealId };
  }
  return null;
}

function renderNoteContent(run: AgentRun): string {
  if (!run.draft) return '';
  const variants = (run.draft.variants ?? [])
    .map((v) => `\n--- ${v.label} ---\n${v.body}`)
    .join('\n');
  const meta = run.draft.metaDescription
    ? `Meta: ${run.draft.metaDescription}\n\n`
    : '';
  const seo = run.draft.seoTitle ? `SEO title: ${run.draft.seoTitle}\n` : '';
  return `${seo}${meta}${run.draft.body}${variants}`;
}

function nextBusinessDayIso(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  const day = date.getUTCDay();
  if (day === 6) date.setUTCDate(date.getUTCDate() + 2); // Sat -> Mon
  if (day === 0) date.setUTCDate(date.getUTCDate() + 1); // Sun -> Mon
  return date.toISOString().slice(0, 10);
}

function runUrl(runId: string): string {
  const base = process.env.WEB_ORIGIN ?? 'http://localhost:3001';
  return `${base.replace(/\/$/, '')}/runs/${runId}`;
}

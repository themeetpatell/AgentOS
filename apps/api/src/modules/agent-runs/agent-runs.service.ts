import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  draftSchema,
  type AgentRun,
  type AuditEvent,
  type ContentPlan,
  type Draft,
  type ReviewAction,
  type RunStatus,
  type TokenUsage,
  type ValidationReport,
} from '@finanshels-neuro/shared';
import { COLLECTIONS, FirestoreService } from '../firestore/firestore.service';
import { PublishService, type PublishResult } from '../publish/publish.service';
import { AgentRunRepository } from './agent-run.repository';

const ALLOWED_TRANSITIONS: Readonly<Record<RunStatus, ReadonlyArray<RunStatus>>> = {
  QUEUED: ['PLANNING', 'CANCELLED', 'FAILED', 'BUDGET_BLOCKED'],
  PLANNING: ['EXECUTING', 'FAILED', 'CANCELLED'],
  EXECUTING: ['VALIDATING', 'FAILED', 'CANCELLED'],
  VALIDATING: ['AWAITING_REVIEW', 'FAILED', 'CANCELLED'],
  AWAITING_REVIEW: ['APPROVED', 'REJECTED', 'EDITED', 'CANCELLED'],
  EDITED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PUBLISHED', 'ARCHIVED'],
  REJECTED: ['ARCHIVED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: [],
  FAILED: ['QUEUED'],
  BUDGET_BLOCKED: ['QUEUED', 'CANCELLED'],
};

@Injectable()
export class AgentRunsService {
  private readonly logger = new Logger(AgentRunsService.name);

  constructor(
    private readonly runs: AgentRunRepository,
    private readonly firestoreService: FirestoreService,
    private readonly publisher: PublishService,
  ) {}

  async getRun(id: string): Promise<AgentRun> {
    const run = await this.runs.findById(id);
    if (!run) {
      throw new NotFoundException(`Run ${id} not found`);
    }
    return run;
  }

  async listRuns(filter: 'active' | 'history' | 'all'): Promise<AgentRun[]> {
    return this.runs.list(filter);
  }

  async setStatus(
    id: string,
    next: RunStatus,
    actor: string,
  ): Promise<AgentRun> {
    const current = await this.getRun(id);
    this.assertTransition(current.status, next);
    return this.runs.update(id, { status: next });
  }

  async incrementAttempts(id: string): Promise<AgentRun> {
    const current = await this.getRun(id);
    return this.runs.update(id, { attempts: current.attempts + 1 });
  }

  async recordPlan(
    id: string,
    plan: ContentPlan,
    tokenUsage: TokenUsage,
    actor: string,
  ): Promise<AgentRun> {
    const current = await this.getRun(id);
    this.assertTransition(current.status, 'EXECUTING');
    const merged = mergeTokenUsage(current.tokenUsage, tokenUsage);
    const updated = await this.runs.update(id, {
      plan,
      status: 'EXECUTING',
      tokenUsage: merged,
    });
    await this.writeAudit({
      runId: id,
      actor,
      action: 'PLAN_GENERATED',
      after: { plan, tokenUsage: merged },
    });
    return updated;
  }

  async recordDraft(
    id: string,
    draft: Draft,
    tokenUsage: TokenUsage,
    actor: string,
  ): Promise<AgentRun> {
    const current = await this.getRun(id);
    this.assertTransition(current.status, 'VALIDATING');
    const merged = mergeTokenUsage(current.tokenUsage, tokenUsage);
    const updated = await this.runs.update(id, {
      draft,
      status: 'VALIDATING',
      tokenUsage: merged,
    });
    await this.writeAudit({
      runId: id,
      actor,
      action: 'DRAFT_GENERATED',
      after: { draft, tokenUsage: merged },
    });
    return updated;
  }

  async recordValidation(
    id: string,
    report: ValidationReport,
    tokenUsage: TokenUsage,
    actor: string,
  ): Promise<AgentRun> {
    const current = await this.getRun(id);
    this.assertTransition(current.status, 'AWAITING_REVIEW');
    const merged = mergeTokenUsage(current.tokenUsage, tokenUsage);
    const updated = await this.runs.update(id, {
      validation: report,
      status: 'AWAITING_REVIEW',
      tokenUsage: merged,
    });
    await this.writeAudit({
      runId: id,
      actor,
      action: 'VALIDATED',
      after: { validation: report, tokenUsage: merged },
    });
    return updated;
  }

  async markFailed(id: string, errorMessage: string): Promise<AgentRun> {
    const current = await this.getRun(id);
    this.assertTransition(current.status, 'FAILED');
    return this.runs.update(id, { status: 'FAILED', errorMessage });
  }

  async applyReview(
    id: string,
    action: ReviewAction,
    actor: string,
  ): Promise<AgentRun> {
    const current = await this.getRun(id);
    if (current.status !== 'AWAITING_REVIEW' && current.status !== 'EDITED') {
      throw new BadRequestException(
        `Run ${id} is not awaiting review (status: ${current.status})`,
      );
    }

    switch (action.action) {
      case 'approve': {
        const updated = await this.runs.update(id, {
          status: 'APPROVED',
          reviewedBy: actor,
        });
        await this.writeAudit({ runId: id, actor, action: 'APPROVED' });
        return updated;
      }
      case 'reject': {
        const updated = await this.runs.update(id, {
          status: 'REJECTED',
          reviewedBy: actor,
          errorMessage: action.reason,
        });
        await this.writeAudit({
          runId: id,
          actor,
          action: 'REJECTED',
          after: { reason: action.reason },
        });
        return updated;
      }
      case 'edit': {
        const editedDraft = draftSchema.parse(action.draft);
        const updated = await this.runs.update(id, {
          draft: editedDraft,
          status: 'EDITED',
          reviewedBy: actor,
        });
        await this.writeAudit({
          runId: id,
          actor,
          action: 'EDITED',
          before: { draft: current.draft },
          after: { draft: editedDraft },
        });
        return updated;
      }
    }
  }

  async publish(
    id: string,
    actor: string,
  ): Promise<{ run: AgentRun; publish: PublishResult }> {
    const current = await this.getRun(id);
    if (current.status !== 'APPROVED') {
      throw new BadRequestException(
        `Run ${id} must be APPROVED to publish (status: ${current.status})`,
      );
    }
    const publish = await this.publisher.publish(current);
    this.assertTransition(current.status, 'PUBLISHED');
    const run = await this.runs.update(id, { status: 'PUBLISHED' });
    await this.writeAudit({
      runId: id,
      actor,
      action: 'PUBLISHED',
      after: { destination: publish.destination, externalId: publish.externalId },
    });
    return { run, publish };
  }

  private assertTransition(from: RunStatus, to: RunStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Illegal transition ${from} -> ${to}`);
    }
  }

  private async writeAudit(input: {
    runId: string;
    actor: string;
    action: AuditEvent['action'];
    before?: unknown;
    after?: unknown;
  }): Promise<void> {
    const id = randomUUID();
    const event: AuditEvent = {
      id,
      runId: input.runId,
      actor: input.actor,
      action: input.action,
      before: input.before,
      after: input.after,
      createdAt: new Date().toISOString(),
    };
    await this.firestoreService
      .db()
      .collection(COLLECTIONS.auditEvents)
      .doc(id)
      .set(event);
  }
}

function mergeTokenUsage(
  prev: TokenUsage | undefined,
  next: TokenUsage,
): TokenUsage {
  if (!prev) return next;
  return {
    inputTokens: prev.inputTokens + next.inputTokens,
    outputTokens: prev.outputTokens + next.outputTokens,
    costUsd: Number((prev.costUsd + next.costUsd).toFixed(6)),
  };
}

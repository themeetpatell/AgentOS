import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Agent,
  AgentExecutionContext,
  CrmDataset,
  CrmRecordSnapshot,
} from '@finanshels-neuro/agents';
import type { AgentId, AgentRun, Brief } from '@finanshels-neuro/shared';
import type {
  ZohoActivity,
  ZohoDeal,
  ZohoUser,
} from '../zoho/zoho.types';
import { AGENT_REGISTRY_TOKEN } from '../agents/agents.module';
import { AgentRunsService } from '../agent-runs/agent-runs.service';
import { BrandContextService } from '../brand-context/brand-context.service';
import { BriefsService } from '../briefs/briefs.service';
import {
  CloudTasksService,
  type AgentPhase,
} from '../cloud-tasks/cloud-tasks.service';
import { ZohoService } from '../zoho/zoho.service';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_SECONDS = 4;

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly runs: AgentRunsService,
    private readonly briefs: BriefsService,
    private readonly brandContext: BrandContextService,
    private readonly cloudTasks: CloudTasksService,
    private readonly config: ConfigService,
    private readonly zoho: ZohoService,
    @Inject(AGENT_REGISTRY_TOKEN)
    private readonly registry: Readonly<Record<string, Agent>>,
  ) {}

  async handlePhase(
    phase: AgentPhase,
    runId: string,
    attempt: number,
  ): Promise<AgentRun> {
    const run = await this.runs.getRun(runId);
    if (
      run.status === 'CANCELLED' ||
      run.status === 'ARCHIVED' ||
      run.status === 'FAILED'
    ) {
      this.logger.log(`Run ${runId} is ${run.status}; skipping ${phase}`);
      return run;
    }

    const brief = await this.briefs.findById(run.briefId);
    if (!brief) {
      throw new NotFoundException(`Brief ${run.briefId} not found`);
    }

    const agent = this.registry[run.agentId];
    if (!agent) {
      return this.runs.markFailed(runId, `Unknown agent ${run.agentId}`);
    }

    const context = await this.buildContext(brief);
    const actor = 'system:orchestrator';

    try {
      if (phase === 'plan') {
        await this.runs.setStatus(runId, 'PLANNING', actor);
        const { plan, tokenUsage } = await agent.plan(brief, context);
        await this.runs.recordPlan(runId, plan, tokenUsage, actor);
        await this.cloudTasks.enqueue({ phase: 'execute', runId, attempt: 1 });
        return this.runs.getRun(runId);
      }

      if (phase === 'execute') {
        if (!run.plan) {
          throw new Error('Cannot execute: plan is missing');
        }
        const { draft, tokenUsage } = await agent.execute(
          brief,
          run.plan,
          context,
        );
        await this.runs.recordDraft(runId, draft, tokenUsage, actor);
        await this.cloudTasks.enqueue({ phase: 'validate', runId, attempt: 1 });
        return this.runs.getRun(runId);
      }

      if (phase === 'validate') {
        if (!run.draft) {
          throw new Error('Cannot validate: draft is missing');
        }
        const { report, tokenUsage } = await agent.validate(run.draft, context);
        await this.runs.recordValidation(runId, report, tokenUsage, actor);
        return this.runs.getRun(runId);
      }

      throw new Error(`Unknown phase ${phase as string}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Phase ${phase} failed for run ${runId} attempt ${attempt}: ${message}`,
      );

      if (attempt < MAX_ATTEMPTS) {
        await this.runs.incrementAttempts(runId);
        await this.cloudTasks.enqueue({
          phase,
          runId,
          attempt: attempt + 1,
          scheduleInSeconds: RETRY_DELAY_SECONDS * attempt,
        });
        return this.runs.getRun(runId);
      }

      return this.runs.markFailed(runId, message);
    }
  }

  private async buildContext(brief: Brief): Promise<AgentExecutionContext> {
    const brand = await this.brandContext.getActive();
    const crmRecord = await this.maybeFetchCrm(brief);
    const crmDataset = await this.maybeFetchDataset(brief);
    return {
      brandContextVersion: brand.version,
      brandContextPrompt: this.brandContext.renderPrompt(brand),
      anthropicApiKey: this.config.get<string>('app.anthropic.apiKey') ?? '',
      planModel:
        this.config.get<string>('app.anthropic.planModel') ?? 'claude-opus-4-7',
      executeModel:
        this.config.get<string>('app.anthropic.executeModel') ??
        'claude-sonnet-4-6',
      lightModel:
        this.config.get<string>('app.anthropic.lightModel') ??
        'claude-haiku-4-5-20251001',
      crmRecord,
      crmDataset,
    };
  }

  /**
   * Pre-fetch the matching Zoho record when the brief carries a CRM ref.
   * Returns `undefined` if Zoho is not configured or the record isn't found —
   * sales agents handle the missing-record case gracefully so the run can
   * still progress.
   */
  private async maybeFetchCrm(
    brief: Brief,
  ): Promise<CrmRecordSnapshot | undefined> {
    if (!brief.context || !this.zoho.isConfigured()) {
      return undefined;
    }
    const leadId = brief.context.leadId;
    const dealId = brief.context.dealId;

    try {
      if (leadId) {
        const lead = await this.zoho.getLead(leadId);
        if (!lead) return undefined;
        return { module: 'Leads', id: lead.id, fields: lead };
      }
      if (dealId) {
        const deal = await this.zoho.getDeal(dealId);
        if (!deal) return undefined;
        return { module: 'Deals', id: deal.id, fields: deal };
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Zoho pre-fetch failed for brief ${brief.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return undefined;
  }

  /**
   * For analytics agents, pre-fetch the right aggregated Zoho dataset and
   * pack it into `crmDataset`. Returns undefined for non-analytics agents
   * or when Zoho is not configured.
   */
  private async maybeFetchDataset(
    brief: Brief,
  ): Promise<CrmDataset | undefined> {
    const id = brief.agentId as AgentId;
    if (!ANALYTICS_AGENTS.has(id)) return undefined;
    if (!this.zoho.isConfigured()) return undefined;

    try {
      switch (id) {
        case 'pipeline-health':
          return await this.buildPipelineDataset();
        case 'deal-risk':
          return await this.buildDealRiskDataset();
        case 'win-loss':
          return await this.buildWinLossDataset(brief);
        case 'rep-scorecard':
          return await this.buildRepScorecardDataset(brief);
        default:
          return undefined;
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Zoho dataset fetch failed for ${id} brief ${brief.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }

  private async buildPipelineDataset(): Promise<CrmDataset> {
    const openDeals = await this.zoho.listOpenDeals();
    return {
      label: 'open-deals',
      data: { openDeals: openDeals.map(slimDeal) },
      counts: { openDeals: openDeals.length },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async buildDealRiskDataset(): Promise<CrmDataset> {
    const openDeals = await this.zoho.listOpenDeals();
    // Cap activity fan-out to avoid blowing up the request budget.
    const deals = openDeals.slice(0, 60);
    const activitiesByDealId: Record<string, ZohoActivity[]> = {};
    await Promise.all(
      deals.map(async (deal) => {
        try {
          activitiesByDealId[deal.id] = await this.zoho.listActivities(
            'Deals',
            deal.id,
            20,
          );
        } catch {
          activitiesByDealId[deal.id] = [];
        }
      }),
    );
    return {
      label: 'open-deals-with-activities',
      data: {
        openDeals: deals.map(slimDeal),
        activitiesByDealId,
        truncated: openDeals.length > deals.length,
      },
      counts: {
        openDeals: deals.length,
        totalOpen: openDeals.length,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async buildWinLossDataset(brief: Brief): Promise<CrmDataset> {
    const daysBack = parseDaysBack(brief.context?.daysBack) ?? 90;
    const closedDeals = await this.zoho.listClosedDeals(daysBack);
    return {
      label: `closed-${daysBack}d`,
      data: {
        windowDays: daysBack,
        closedDeals: closedDeals.map(slimDeal),
      },
      counts: {
        closedDeals: closedDeals.length,
        windowDays: daysBack,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  private async buildRepScorecardDataset(brief: Brief): Promise<CrmDataset> {
    const daysBack = parseDaysBack(brief.context?.daysBack) ?? 30;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - daysBack);
    const sinceIso = since.toISOString().slice(0, 10);

    const [users, openDeals, closedDeals] = await Promise.all([
      this.zoho.listActiveUsers(),
      this.zoho.listOpenDeals({ modifiedSince: sinceIso }),
      this.zoho.listClosedDeals(daysBack),
    ]);

    const dealsByOwnerId: Record<string, ReturnType<typeof slimDeal>[]> = {};
    for (const deal of [...openDeals, ...closedDeals]) {
      const ownerId = deal.Owner?.id;
      if (!ownerId) continue;
      (dealsByOwnerId[ownerId] ??= []).push(slimDeal(deal));
    }

    return {
      label: `rep-scorecard-${daysBack}d`,
      data: {
        windowDays: daysBack,
        users: users.map((u) => ({ id: u.id, name: u.full_name, email: u.email })),
        dealsByOwnerId,
      },
      counts: {
        users: users.length,
        openDeals: openDeals.length,
        closedDeals: closedDeals.length,
        windowDays: daysBack,
      },
      fetchedAt: new Date().toISOString(),
    };
  }
}

const ANALYTICS_AGENTS: ReadonlySet<AgentId> = new Set<AgentId>([
  'pipeline-health',
  'deal-risk',
  'win-loss',
  'rep-scorecard',
]);

/**
 * Slim a Zoho deal down to the fields analytics agents actually use.
 * Keeps prompts compact and avoids leaking unrelated CRM fields to the model.
 */
function slimDeal(deal: ZohoDeal) {
  return {
    id: deal.id,
    name: deal.Deal_Name,
    stage: deal.Stage,
    amount: deal.Amount,
    closingDate: deal.Closing_Date,
    owner: deal.Owner ? { id: deal.Owner.id, name: deal.Owner.name } : undefined,
    account: deal.Account_Name?.name,
    contact: deal.Contact_Name?.name,
    createdTime: deal.Created_Time,
    modifiedTime: deal.Modified_Time,
  };
}

function parseDaysBack(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 365) return undefined;
  return Math.floor(n);
}

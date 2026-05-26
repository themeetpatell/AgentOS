import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Agent, AgentExecutionContext } from '@finanshels-neuro/agents';
import type { AgentRun } from '@finanshels-neuro/shared';
import { AGENT_REGISTRY_TOKEN } from '../agents/agents.module';
import { AgentRunsService } from '../agent-runs/agent-runs.service';
import { BrandContextService } from '../brand-context/brand-context.service';
import { BriefsService } from '../briefs/briefs.service';
import {
  CloudTasksService,
  type AgentPhase,
} from '../cloud-tasks/cloud-tasks.service';

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

    const context = await this.buildContext();
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

  private async buildContext(): Promise<AgentExecutionContext> {
    const brand = await this.brandContext.getActive();
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
    };
  }
}

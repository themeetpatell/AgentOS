import { ConflictException, Injectable, Logger } from '@nestjs/common';
import type { AgentRun, Brief, BriefInput } from '@finanshels-neuro/shared';
import { AgentRunRepository } from '../agent-runs/agent-run.repository';
import { CloudTasksService } from '../cloud-tasks/cloud-tasks.service';
import { BriefRepository } from './brief.repository';

export interface SubmitBriefResult {
  readonly brief: Brief;
  readonly run: AgentRun;
}

@Injectable()
export class BriefsService {
  private readonly logger = new Logger(BriefsService.name);

  constructor(
    private readonly briefs: BriefRepository,
    private readonly runs: AgentRunRepository,
    private readonly cloudTasks: CloudTasksService,
  ) {}

  async findById(id: string): Promise<Brief | null> {
    return this.briefs.findById(id);
  }

  async submit(
    input: BriefInput,
    actorUid: string,
  ): Promise<SubmitBriefResult> {
    const brief = await this.briefs.create({ ...input, createdBy: actorUid });

    if (await this.runs.hasActiveRunForBrief(brief.id)) {
      throw new ConflictException(
        `Brief ${brief.id} already has an active run`,
      );
    }

    const run = await this.runs.create({
      briefId: brief.id,
      agentId: brief.agentId,
      createdBy: actorUid,
    });

    try {
      await this.cloudTasks.enqueue({
        phase: 'plan',
        runId: run.id,
        attempt: 1,
      });
    } catch (err: unknown) {
      this.logger.error(
        `Failed to enqueue plan task for run ${run.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }

    return { brief, run };
  }
}

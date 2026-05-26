import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { AgentRun } from '@finanshels-neuro/shared';
import { OrchestratorService } from './orchestrator.service';

const taskPayloadSchema = z.object({
  runId: z.string().min(1),
  attempt: z.number().int().min(1).max(10),
});

/**
 * Worker endpoints invoked by Cloud Tasks with an OIDC token
 * signed by the queue's invoker service account. Cloud Run verifies
 * the OIDC; we add a queue-name header check for defense in depth.
 */
@Controller('internal/agents')
export class OrchestratorController {
  private readonly logger = new Logger(OrchestratorController.name);
  private readonly expectedQueue: string;

  constructor(
    private readonly orchestrator: OrchestratorService,
    config: ConfigService,
  ) {
    this.expectedQueue = config.get<string>('app.cloudTasks.queue') ?? '';
  }

  @Post('plan')
  plan(
    @Body() body: unknown,
    @Headers('x-cloudtasks-queuename') queue?: string,
  ): Promise<{ run: AgentRun }> {
    return this.dispatch('plan', body, queue);
  }

  @Post('execute')
  execute(
    @Body() body: unknown,
    @Headers('x-cloudtasks-queuename') queue?: string,
  ): Promise<{ run: AgentRun }> {
    return this.dispatch('execute', body, queue);
  }

  @Post('validate')
  validate(
    @Body() body: unknown,
    @Headers('x-cloudtasks-queuename') queue?: string,
  ): Promise<{ run: AgentRun }> {
    return this.dispatch('validate', body, queue);
  }

  private async dispatch(
    phase: 'plan' | 'execute' | 'validate',
    body: unknown,
    queueHeader: string | undefined,
  ): Promise<{ run: AgentRun }> {
    if (
      process.env.NODE_ENV === 'production' &&
      this.expectedQueue &&
      queueHeader &&
      queueHeader !== this.expectedQueue
    ) {
      throw new UnauthorizedException(
        `Unexpected queue header: ${queueHeader}`,
      );
    }

    const parsed = taskPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    this.logger.log(
      `Dispatching ${phase} for run ${parsed.data.runId} attempt ${parsed.data.attempt}`,
    );
    const run = await this.orchestrator.handlePhase(
      phase,
      parsed.data.runId,
      parsed.data.attempt,
    );
    return { run };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudTasksClient, protos } from '@google-cloud/tasks';

export type AgentPhase = 'plan' | 'execute' | 'validate';

export interface EnqueueAgentTaskInput {
  readonly phase: AgentPhase;
  readonly runId: string;
  readonly attempt: number;
  /** Optional delay in seconds before the task should be dispatched. */
  readonly scheduleInSeconds?: number;
}

interface CloudTasksConfig {
  readonly projectId: string;
  readonly location: string;
  readonly queue: string;
  readonly workerUrl: string;
  readonly invokerSa: string;
  readonly localDev: boolean;
}

@Injectable()
export class CloudTasksService {
  private readonly logger = new Logger(CloudTasksService.name);
  private client?: CloudTasksClient;
  private readonly config: CloudTasksConfig;

  constructor(configService: ConfigService) {
    this.config = {
      projectId: configService.get<string>('app.gcp.projectId') ?? '',
      location: configService.get<string>('app.cloudTasks.location') ?? '',
      queue: configService.get<string>('app.cloudTasks.queue') ?? '',
      workerUrl: configService.get<string>('app.cloudTasks.workerUrl') ?? '',
      invokerSa: configService.get<string>('app.cloudTasks.invokerSa') ?? '',
      localDev: configService.get<boolean>('app.localDev') ?? false,
    };
  }

  async enqueue(input: EnqueueAgentTaskInput): Promise<string> {
    if (this.config.localDev) {
      return this.enqueueLocal(input);
    }

    const { projectId, location, queue, workerUrl, invokerSa } = this.config;
    if (!projectId || !location || !queue || !workerUrl) {
      throw new Error(
        'Cloud Tasks not fully configured (project, location, queue, workerUrl required)',
      );
    }
    if (!this.client) {
      this.client = new CloudTasksClient();
    }
    const client = this.client;

    const parent = client.queuePath(projectId, location, queue);
    const url = `${workerUrl.replace(/\/$/, '')}/internal/agents/${input.phase}`;
    const body = Buffer.from(
      JSON.stringify({ runId: input.runId, attempt: input.attempt }),
    ).toString('base64');

    const task: protos.google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: 'POST',
        url,
        headers: { 'Content-Type': 'application/json' },
        body,
        ...(invokerSa
          ? { oidcToken: { serviceAccountEmail: invokerSa, audience: url } }
          : {}),
      },
      ...(input.scheduleInSeconds
        ? {
            scheduleTime: {
              seconds: Math.floor(Date.now() / 1000) + input.scheduleInSeconds,
            },
          }
        : {}),
    };

    const [created] = await client.createTask({ parent, task });
    const name = created.name ?? '';
    this.logger.log(
      `Enqueued ${input.phase} for run ${input.runId} (attempt ${input.attempt}): ${name}`,
    );
    return name;
  }

  /**
   * Local-dev path: instead of creating a real Cloud Task, fire-and-forget
   * an HTTP POST to our own worker endpoint. Same code path as production
   * dispatch — just runs in-process. Caller (briefs.controller, orchestrator)
   * returns immediately; the worker request runs concurrently.
   */
  private async enqueueLocal(input: EnqueueAgentTaskInput): Promise<string> {
    const workerUrl = this.config.workerUrl || 'http://localhost:3000';
    const url = `${workerUrl.replace(/\/$/, '')}/internal/agents/${input.phase}`;
    const body = JSON.stringify({
      runId: input.runId,
      attempt: input.attempt,
    });
    const delayMs = (input.scheduleInSeconds ?? 0) * 1000;

    const fire = (): void => {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch((err: unknown) => {
        this.logger.error(
          `Local-dev dispatch failed for ${input.phase} run ${input.runId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    };

    if (delayMs > 0) {
      setTimeout(fire, delayMs);
    } else {
      // Yield to the event loop so the calling HTTP request returns first.
      setImmediate(fire);
    }

    const id = `local-dev:${input.phase}:${input.runId}:${input.attempt}`;
    this.logger.log(
      `[local-dev] dispatched ${input.phase} for run ${input.runId} (attempt ${input.attempt})`,
    );
    return id;
  }
}

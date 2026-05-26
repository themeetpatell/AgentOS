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
}

@Injectable()
export class CloudTasksService {
  private readonly logger = new Logger(CloudTasksService.name);
  private readonly client: CloudTasksClient;
  private readonly config: CloudTasksConfig;

  constructor(configService: ConfigService) {
    this.client = new CloudTasksClient();
    this.config = {
      projectId: configService.get<string>('app.gcp.projectId') ?? '',
      location: configService.get<string>('app.cloudTasks.location') ?? '',
      queue: configService.get<string>('app.cloudTasks.queue') ?? '',
      workerUrl: configService.get<string>('app.cloudTasks.workerUrl') ?? '',
      invokerSa: configService.get<string>('app.cloudTasks.invokerSa') ?? '',
    };
  }

  async enqueue(input: EnqueueAgentTaskInput): Promise<string> {
    const { projectId, location, queue, workerUrl, invokerSa } = this.config;
    if (!projectId || !location || !queue || !workerUrl) {
      throw new Error(
        'Cloud Tasks not fully configured (project, location, queue, workerUrl required)',
      );
    }

    const parent = this.client.queuePath(projectId, location, queue);
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

    const [created] = await this.client.createTask({ parent, task });
    const name = created.name ?? '';
    this.logger.log(
      `Enqueued ${input.phase} for run ${input.runId} (attempt ${input.attempt}): ${name}`,
    );
    return name;
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  reviewActionSchema,
  type AgentRun,
  type ReviewAction,
} from '@finanshels-neuro/shared';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/firebase-auth.guard';
import { AgentRunsService } from './agent-runs.service';

interface RunsResponse {
  readonly runs: ReadonlyArray<AgentRun>;
}

@UseGuards(FirebaseAuthGuard)
@Controller('runs')
export class AgentRunsController {
  constructor(private readonly runs: AgentRunsService) {}

  @Get()
  async list(@Query('status') status?: string): Promise<RunsResponse> {
    const filter = parseFilter(status);
    const runs = await this.runs.listRuns(filter);
    return { runs };
  }

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<{ run: AgentRun }> {
    const run = await this.runs.getRun(id);
    return { run };
  }

  @Post(':id/review')
  async review(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ run: AgentRun }> {
    const parsed = reviewActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const action: ReviewAction = parsed.data;
    const run = await this.runs.applyReview(id, action, user.uid);
    return { run };
  }
}

function parseFilter(value?: string): 'active' | 'history' | 'all' {
  if (value === 'active' || value === 'history' || value === 'all') {
    return value;
  }
  return 'all';
}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AgentRunRepository } from './agent-run.repository';
import { AgentRunsService } from './agent-runs.service';
import { AgentRunsController } from './agent-runs.controller';

@Module({
  imports: [AuthModule],
  controllers: [AgentRunsController],
  providers: [AgentRunRepository, AgentRunsService],
  exports: [AgentRunsService, AgentRunRepository],
})
export class AgentRunsModule {}

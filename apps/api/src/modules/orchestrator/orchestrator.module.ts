import { Module } from '@nestjs/common';
import { AgentRunsModule } from '../agent-runs/agent-runs.module';
import { AgentsModule } from '../agents/agents.module';
import { BrandContextModule } from '../brand-context/brand-context.module';
import { BriefsModule } from '../briefs/briefs.module';
import { CloudTasksModule } from '../cloud-tasks/cloud-tasks.module';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';

@Module({
  imports: [
    AgentRunsModule,
    AgentsModule,
    BrandContextModule,
    BriefsModule,
    CloudTasksModule,
  ],
  controllers: [OrchestratorController],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}

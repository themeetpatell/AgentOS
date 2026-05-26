import { Module } from '@nestjs/common';
import { AgentRunsModule } from '../agent-runs/agent-runs.module';
import { AuthModule } from '../auth/auth.module';
import { CloudTasksModule } from '../cloud-tasks/cloud-tasks.module';
import { BriefRepository } from './brief.repository';
import { BriefsService } from './briefs.service';
import { BriefsController } from './briefs.controller';

@Module({
  imports: [AgentRunsModule, AuthModule, CloudTasksModule],
  controllers: [BriefsController],
  providers: [BriefRepository, BriefsService],
  exports: [BriefsService, BriefRepository],
})
export class BriefsModule {}

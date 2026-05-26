import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import configuration from './config/configuration';
import { HealthModule } from './modules/health/health.module';
import { FirestoreModule } from './modules/firestore/firestore.module';
import { AuthModule } from './modules/auth/auth.module';
import { AgentRunsModule } from './modules/agent-runs/agent-runs.module';
import { BriefsModule } from './modules/briefs/briefs.module';
import { CloudTasksModule } from './modules/cloud-tasks/cloud-tasks.module';
import { AgentsModule } from './modules/agents/agents.module';
import { BrandContextModule } from './modules/brand-context/brand-context.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    TerminusModule,
    FirestoreModule,
    AuthModule,
    CloudTasksModule,
    AgentsModule,
    BrandContextModule,
    AgentRunsModule,
    BriefsModule,
    OrchestratorModule,
    HealthModule,
  ],
})
export class AppModule {}

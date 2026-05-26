import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import configuration from './config/configuration';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    TerminusModule,
    HealthModule,
    // Sprint 1 adds: FirestoreModule, CloudTasksModule, AgentRunsModule,
    //                BriefsModule, OrchestratorModule, AgentsModule, BrandContextModule
  ],
})
export class AppModule {}

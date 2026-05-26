import { Module } from '@nestjs/common';
import { AGENT_REGISTRY } from '@finanshels-neuro/agents';

export const AGENT_REGISTRY_TOKEN = Symbol.for('AGENT_REGISTRY');

@Module({
  providers: [
    {
      provide: AGENT_REGISTRY_TOKEN,
      useValue: AGENT_REGISTRY,
    },
  ],
  exports: [AGENT_REGISTRY_TOKEN],
})
export class AgentsModule {}

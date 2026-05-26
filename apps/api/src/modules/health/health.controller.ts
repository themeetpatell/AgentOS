import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  readonly status: 'ok';
  readonly uptimeSeconds: number;
  readonly timestamp: string;
  readonly service: 'finanshels-neuro-api';
}

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      service: 'finanshels-neuro-api',
    };
  }
}

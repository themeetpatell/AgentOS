import { Module } from '@nestjs/common';
import { CloudTasksService } from './cloud-tasks.service';

@Module({
  providers: [CloudTasksService],
  exports: [CloudTasksService],
})
export class CloudTasksModule {}

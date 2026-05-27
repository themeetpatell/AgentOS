import { Module } from '@nestjs/common';
import { ZohoModule } from '../zoho/zoho.module';
import { PublishService } from './publish.service';
import { ZohoPublishAdapter } from './zoho-publish.adapter';

@Module({
  imports: [ZohoModule],
  providers: [PublishService, ZohoPublishAdapter],
  exports: [PublishService],
})
export class PublishModule {}

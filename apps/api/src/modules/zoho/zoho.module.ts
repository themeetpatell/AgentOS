import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ZohoService } from './zoho.service';
import { ZohoController } from './zoho.controller';

@Module({
  imports: [AuthModule],
  controllers: [ZohoController],
  providers: [ZohoService],
  exports: [ZohoService],
})
export class ZohoModule {}

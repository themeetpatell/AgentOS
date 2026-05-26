import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BrandContextService } from './brand-context.service';
import { BrandContextController } from './brand-context.controller';

@Module({
  imports: [AuthModule],
  controllers: [BrandContextController],
  providers: [BrandContextService],
  exports: [BrandContextService],
})
export class BrandContextModule {}

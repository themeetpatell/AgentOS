import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import type { BrandContext } from '@finanshels-neuro/shared';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { BrandContextService } from './brand-context.service';

const brandContextSchema = z.object({
  version: z.string().min(1).max(40),
  voice: z.string().min(1).max(4000),
  icp: z.string().min(1).max(4000),
  glossary: z
    .array(
      z.object({
        term: z.string().min(1).max(60),
        definition: z.string().min(1).max(400),
      }),
    )
    .max(200),
  dos: z.array(z.string().min(1).max(400)).max(100),
  donts: z.array(z.string().min(1).max(400)).max(100),
});

@UseGuards(FirebaseAuthGuard)
@Controller('brand-context')
export class BrandContextController {
  constructor(private readonly service: BrandContextService) {}

  @Get()
  async get(): Promise<{ brandContext: BrandContext }> {
    const brandContext = await this.service.getActive();
    return { brandContext };
  }

  @Put()
  async update(@Body() body: unknown): Promise<{ brandContext: BrandContext }> {
    const parsed = brandContextSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const brandContext = await this.service.update(parsed.data);
    return { brandContext };
  }
}

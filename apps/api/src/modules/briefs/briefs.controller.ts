import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { briefInputSchema } from '@finanshels-neuro/shared';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/firebase-auth.guard';
import { BriefsService, type SubmitBriefResult } from './briefs.service';

@UseGuards(FirebaseAuthGuard)
@Controller('briefs')
export class BriefsController {
  constructor(private readonly briefs: BriefsService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubmitBriefResult> {
    const parsed = briefInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return this.briefs.submit(parsed.data, user.uid);
  }
}

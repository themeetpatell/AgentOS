import { Injectable } from '@nestjs/common';
import type { BrandContext } from '@finanshels-neuro/shared';
import {
  brandContextV1,
  renderBrandContextPrompt,
} from '@finanshels-neuro/prompts';
import { COLLECTIONS, FirestoreService } from '../firestore/firestore.service';

@Injectable()
export class BrandContextService {
  constructor(private readonly firestoreService: FirestoreService) {}

  private collection() {
    return this.firestoreService.db().collection(COLLECTIONS.brandContexts);
  }

  async getActive(): Promise<BrandContext> {
    const stored = await this.collection().doc('active').get();
    if (stored.exists) {
      return stored.data() as BrandContext;
    }
    // Seed default on first read so the /brand editor has a starting point.
    await this.collection().doc('active').set(brandContextV1);
    return brandContextV1;
  }

  async update(next: BrandContext): Promise<BrandContext> {
    await this.collection().doc('active').set(next);
    return next;
  }

  renderPrompt(ctx: BrandContext): string {
    return renderBrandContextPrompt(ctx);
  }
}

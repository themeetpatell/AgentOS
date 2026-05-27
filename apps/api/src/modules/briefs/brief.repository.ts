import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Brief, BriefInput } from '@finanshels-neuro/shared';
import { COLLECTIONS, FirestoreService } from '../firestore/firestore.service';

export interface CreateBriefInput extends BriefInput {
  readonly createdBy: string;
}

@Injectable()
export class BriefRepository {
  constructor(private readonly firestoreService: FirestoreService) {}

  private collection() {
    return this.firestoreService.db().collection(COLLECTIONS.briefs);
  }

  async create(input: CreateBriefInput): Promise<Brief> {
    const id = randomUUID();
    const brief: Brief = {
      id,
      agentId: input.agentId,
      title: input.title,
      instructions: input.instructions,
      targetAudience: input.targetAudience,
      wordCountTarget: input.wordCountTarget,
      attachmentUrls: input.attachmentUrls ?? [],
      context: input.context,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
    await this.collection().doc(id).set(brief);
    return brief;
  }

  async findById(id: string): Promise<Brief | null> {
    const snapshot = await this.collection().doc(id).get();
    return snapshot.exists ? (snapshot.data() as Brief) : null;
  }
}

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
  type AgentId,
  type AgentRun,
  type RunStatus,
} from '@finanshels-neuro/shared';
import { COLLECTIONS, FirestoreService } from '../firestore/firestore.service';

export interface CreateAgentRunInput {
  readonly briefId: string;
  readonly agentId: AgentId;
  readonly createdBy: string;
}

export interface UpdateAgentRunInput {
  readonly status?: RunStatus;
  readonly attempts?: number;
  readonly plan?: AgentRun['plan'];
  readonly draft?: AgentRun['draft'];
  readonly validation?: AgentRun['validation'];
  readonly tokenUsage?: AgentRun['tokenUsage'];
  readonly errorMessage?: string;
  readonly reviewedBy?: string;
}

@Injectable()
export class AgentRunRepository {
  constructor(private readonly firestoreService: FirestoreService) {}

  private collection() {
    return this.firestoreService.db().collection(COLLECTIONS.agentRuns);
  }

  async create(input: CreateAgentRunInput): Promise<AgentRun> {
    const now = new Date().toISOString();
    const id = randomUUID();
    const run: AgentRun = {
      id,
      briefId: input.briefId,
      agentId: input.agentId,
      status: 'QUEUED',
      attempts: 0,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    await this.collection().doc(id).set(run);
    return run;
  }

  async findById(id: string): Promise<AgentRun | null> {
    const snapshot = await this.collection().doc(id).get();
    return snapshot.exists ? (snapshot.data() as AgentRun) : null;
  }

  async list(filter: 'active' | 'history' | 'all'): Promise<AgentRun[]> {
    const statuses =
      filter === 'active'
        ? ACTIVE_STATUSES
        : filter === 'history'
          ? TERMINAL_STATUSES
          : null;

    let query: FirebaseFirestore.Query = this.collection().orderBy(
      'updatedAt',
      'desc',
    );
    if (statuses) {
      query = query.where('status', 'in', [...statuses]);
    }

    const snapshot = await query.limit(50).get();
    return snapshot.docs.map((doc) => doc.data() as AgentRun);
  }

  async hasActiveRunForBrief(briefId: string): Promise<boolean> {
    const snapshot = await this.collection()
      .where('briefId', '==', briefId)
      .where('status', 'in', [...ACTIVE_STATUSES])
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  async update(id: string, patch: UpdateAgentRunInput): Promise<AgentRun> {
    const ref = this.collection().doc(id);
    const merged: Partial<AgentRun> & { updatedAt: string } = {
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(merged, { merge: true });
    const after = await ref.get();
    return after.data() as AgentRun;
  }
}

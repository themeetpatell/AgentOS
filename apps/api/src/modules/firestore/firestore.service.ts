import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  initializeApp,
  applicationDefault,
  getApps,
  type App,
} from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

export const COLLECTIONS = Object.freeze({
  briefs: 'briefs',
  agentRuns: 'agent_runs',
  brandContexts: 'brand_contexts',
  auditEvents: 'audit_events',
  users: 'users',
});

@Injectable()
export class FirestoreService implements OnModuleInit {
  private readonly logger = new Logger(FirestoreService.name);
  private app!: App;
  private firestore!: Firestore;
  private auth!: Auth;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const projectId = this.config.get<string>('app.firebase.projectId');
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID is required');
    }

    const existing = getApps()[0];
    this.app =
      existing ??
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });

    this.firestore = getFirestore(this.app);
    this.firestore.settings({ ignoreUndefinedProperties: true });
    this.auth = getAuth(this.app);

    this.logger.log(`Firebase Admin ready (project: ${projectId})`);
  }

  db(): Firestore {
    return this.firestore;
  }

  authClient(): Auth {
    return this.auth;
  }
}

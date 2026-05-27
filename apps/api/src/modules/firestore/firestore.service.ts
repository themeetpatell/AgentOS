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
import { InMemoryFirestore } from './in-memory-store';

export const COLLECTIONS = Object.freeze({
  briefs: 'briefs',
  agentRuns: 'agent_runs',
  brandContexts: 'brand_contexts',
  auditEvents: 'audit_events',
  users: 'users',
});

/**
 * In local-dev mode, the real Firebase Auth client isn't initialized.
 * FirebaseAuthGuard short-circuits before calling `.verifyIdToken`, so we
 * never need this — but FirestoreService.authClient() still needs to
 * return something type-compatible for DI consumers.
 */
const LOCAL_DEV_AUTH_STUB = {
  verifyIdToken: () => {
    throw new Error('Auth.verifyIdToken called in local-dev mode');
  },
} as unknown as Auth;

@Injectable()
export class FirestoreService implements OnModuleInit {
  private readonly logger = new Logger(FirestoreService.name);
  private app?: App;
  private firestore!: Firestore | InMemoryFirestore;
  private auth!: Auth;
  private localDev = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.localDev = this.config.get<boolean>('app.localDev') ?? false;

    if (this.localDev) {
      this.firestore = new InMemoryFirestore();
      this.auth = LOCAL_DEV_AUTH_STUB;
      this.logger.warn(
        'LOCAL-DEV MODE: in-memory Firestore + dev-token auth bypass. Data resets on restart.',
      );
      return;
    }

    const projectId = this.config.get<string>('app.firebase.projectId');
    if (!projectId) {
      throw new Error(
        'FIREBASE_PROJECT_ID is required (or set NEURO_LOCAL_DEV=1 for local mode)',
      );
    }

    const existing = getApps()[0];
    this.app =
      existing ??
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });

    const fs = getFirestore(this.app);
    fs.settings({ ignoreUndefinedProperties: true });
    this.firestore = fs;
    this.auth = getAuth(this.app);

    this.logger.log(`Firebase Admin ready (project: ${projectId})`);
  }

  /**
   * Returns either a real Firestore or the in-memory shim. The shim
   * implements the subset of the Firestore API the app uses; consumers
   * (repositories, services) are written against that subset.
   */
  db(): Firestore {
    return this.firestore as Firestore;
  }

  authClient(): Auth {
    return this.auth;
  }

  isLocalDev(): boolean {
    return this.localDev;
  }
}

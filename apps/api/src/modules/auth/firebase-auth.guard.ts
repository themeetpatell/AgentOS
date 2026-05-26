import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { FirestoreService } from '../firestore/firestore.service';

export interface AuthenticatedUser {
  readonly uid: string;
  readonly email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const SESSION_COOKIE = '__session';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    private readonly firestoreService: FirestoreService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing Firebase ID token');
    }

    const allowedDomain = this.config.get<string>('app.firebase.allowedDomain');
    if (!allowedDomain) {
      throw new Error('FIREBASE_AUTH_ALLOWED_DOMAIN is not configured');
    }

    try {
      const decoded = await this.firestoreService
        .authClient()
        .verifyIdToken(token);
      const email = decoded.email ?? '';
      if (!email.endsWith(`@${allowedDomain}`)) {
        throw new ForbiddenException(
          `Only @${allowedDomain} accounts are allowed`,
        );
      }
      request.user = { uid: decoded.uid, email };
      return true;
    } catch (err: unknown) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      this.logger.warn(
        `Token verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Invalid Firebase ID token');
    }
  }
}

function extractToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  const cookies = (request as Request & { cookies?: Record<string, string> })
    .cookies;
  if (cookies?.[SESSION_COOKIE]) {
    return cookies[SESSION_COOKIE];
  }
  const raw = request.headers.cookie;
  if (raw) {
    for (const part of raw.split(';')) {
      const [k, v] = part.trim().split('=');
      if (k === SESSION_COOKIE && v) {
        return decodeURIComponent(v);
      }
    }
  }
  return undefined;
}

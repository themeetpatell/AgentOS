import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

const SESSION_COOKIE = '__session';
const ALLOWED_DOMAIN = 'finanshels.com';
const DEV_EMAIL_KEY = 'neuro:dev-email';

export function isLocalDev(): boolean {
  return (
    process.env.NEXT_PUBLIC_NEURO_LOCAL_DEV === '1' ||
    process.env.NEXT_PUBLIC_NEURO_LOCAL_DEV === 'true'
  );
}

function ensureApp(): FirebaseApp {
  if (!config.apiKey) {
    throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY is not configured');
  }
  const existing = getApps()[0];
  return existing ?? initializeApp(config);
}

export function getFirebaseAuth(): Auth {
  return getAuth(ensureApp());
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: ALLOWED_DOMAIN });

  const result = await signInWithPopup(auth, provider);
  const email = result.user.email ?? '';
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    await fbSignOut(auth);
    throw new Error(`Only @${ALLOWED_DOMAIN} accounts are allowed`);
  }

  const token = await result.user.getIdToken();
  setSessionCookie(token);
  return result.user;
}

/**
 * Local-dev sign-in: skips Firebase entirely. The auth guard on the API
 * accepts `dev:<email>` tokens when NEURO_LOCAL_DEV=1. Email must still
 * end with `@${ALLOWED_DOMAIN}` so behaviour matches prod.
 */
export function signInAsDev(email: string): { uid: string; email: string } {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error(`Only @${ALLOWED_DOMAIN} accounts are allowed`);
  }
  setSessionCookie(`dev:${cleaned}`);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DEV_EMAIL_KEY, cleaned);
  }
  return { uid: `local-dev:${cleaned}`, email: cleaned };
}

export function getDevEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(DEV_EMAIL_KEY);
}

export async function signOut(): Promise<void> {
  if (!isLocalDev()) {
    try {
      await fbSignOut(getFirebaseAuth());
    } catch {
      // No Firebase app in local-dev — ignore.
    }
  }
  clearSessionCookie();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(DEV_EMAIL_KEY);
  }
}

function setSessionCookie(token: string): void {
  // 5 days; Firebase ID tokens expire in 1 hour, dev tokens never expire.
  const maxAge = 60 * 60 * 24 * 5;
  document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=${maxAge}; samesite=lax`;
}

function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

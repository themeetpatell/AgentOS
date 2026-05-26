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

export async function signOut(): Promise<void> {
  await fbSignOut(getFirebaseAuth());
  clearSessionCookie();
}

function setSessionCookie(token: string): void {
  // 5 days; Firebase ID tokens themselves expire in 1 hour.
  // The API exchanges them for a Firebase session cookie in Sprint 1.
  const maxAge = 60 * 60 * 24 * 5;
  document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=${maxAge}; samesite=lax`;
}

function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

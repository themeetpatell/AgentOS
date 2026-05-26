import { getFirebaseAuth } from './firebase-client';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';

async function authHeader(): Promise<Record<string, string>> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export interface ApiError extends Error {
  status: number;
  details?: unknown;
}

async function request<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeader()),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await safeJson(res);
    const error = new Error(
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: unknown }).message)
        : `API ${res.status} ${res.statusText}`,
    ) as ApiError;
    error.status = res.status;
    error.details = body;
    throw error;
  }

  return (await res.json()) as TResponse;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
};

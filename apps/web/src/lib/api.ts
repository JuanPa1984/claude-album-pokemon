import type {
  AlbumDetailDto,
  AlbumSummaryDto,
  AuthResponseDto,
  CollectionUpdateDto,
  UserDto,
} from '@album-pokemon/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const TOKEN_KEY = 'album-pokemon.token';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const tokenStorage = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable: session will not persist */
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  const token = tokenStorage.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });

  if (!response.ok) {
    let message = response.statusText || 'Request failed';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body.message)
        message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, message);
  }

  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const api = {
  register: (body: { email: string; username: string; password: string }) =>
    request<AuthResponseDto>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponseDto>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<UserDto>('/auth/me'),

  listAlbums: () => request<AlbumSummaryDto[]>('/albums'),
  getAlbum: (slug: string) => request<AlbumDetailDto>(`/albums/${encodeURIComponent(slug)}`),

  markOwned: (stickerId: string) =>
    request<CollectionUpdateDto>(`/collection/stickers/${stickerId}`, { method: 'PUT' }),
  unmarkOwned: (stickerId: string) =>
    request<CollectionUpdateDto>(`/collection/stickers/${stickerId}`, { method: 'DELETE' }),
};

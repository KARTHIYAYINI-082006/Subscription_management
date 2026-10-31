const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '');
const TOKEN_KEY = 'subvio_token';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export type Params = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, params?: Params) {
  const url = new URL(BASE_URL + path);
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  return url.toString();
}

async function send(path: string, init: RequestInit = {}, params?: Params) {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(buildUrl(path, params), {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiError('Cannot reach the server. Please check your connection.', 0);
  }
  if (res.status === 401 && token && path !== '/auth/login') {
    tokenStore.clear();
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.message ?? 'Request failed', res.status);
  }
  return res;
}

async function json<T>(path: string, init?: RequestInit, params?: Params): Promise<T> {
  const res = await send(path, init, params);
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  get: <T>(path: string, params?: Params) => json<T>(path, undefined, params),
  post: <T>(path: string, body?: unknown) => json<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body: unknown) => json<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => json<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => json<void>(path, { method: 'DELETE' }),
  /** Downloads a file response (e.g. CSV export) with the auth header attached. */
  download: async (path: string, params: Params, filename: string) => {
    const blob = await (await send(path, undefined, params)).blob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  },
};

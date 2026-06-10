import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiErrorBody } from '@/types';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Auth interceptor ──────────────────────────────────────────────────────────
// Reads JWT from localStorage (via auth store) and attaches it to every request.
// Runs only on the client side. (Req 23.2)
if (typeof window !== 'undefined') {
  apiClient.interceptors.request.use((config) => {
    try {
      const raw = localStorage.getItem('portfolio-auth');
      const parsed = raw ? (JSON.parse(raw) as { state?: { token?: string } }) : null;
      const token = parsed?.state?.token;
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // ignore parse errors
    }
    return config;
  });

  // On 401 from any admin request → clear token (Req 23.3)
  apiClient.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => {
      if (error.response?.status === 401 && window.location.pathname.includes('/admin')) {
        localStorage.removeItem('portfolio-auth');
        window.location.href = '/admin/login';
      }
      return Promise.reject(error);
    }
  );
}

/** Narrow an unknown error into the API error envelope when possible. */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message.join(', ') : body.message;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

export default apiClient;

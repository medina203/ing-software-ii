import axios from 'axios';
import type { ApiErrorBody } from '../types';

export const TOKEN_STORAGE_KEY = 'obragest_token';

/**
 * En desarrollo la API corre aparte (puerto 4000). En producción el mismo servidor
 * entrega el frontend y la API, así que basta con la ruta relativa /api.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:4000/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = String(error.config?.url ?? '').includes('/auth/login');
    const isInvalidAdminCredentials =
      error.response?.data?.code === 'INVALID_ADMIN_CREDENTIALS';

    if (error.response?.status === 401 && !isLoginRequest && !isInvalidAdminCredentials) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event('obragest:logout'));
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) {
      return 'No se pudo conectar con el servidor. Verifique que la API esté en ejecución.';
    }

    const message = error.response.data?.message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    if (typeof message === 'string') {
      return message;
    }
    if (error.response.status === 403) {
      return 'No tiene permisos para realizar esta acción.';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Ocurrió un error inesperado. Intente nuevamente.';
}

export default api;

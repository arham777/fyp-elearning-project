import axios from 'axios';
import { AuthTokens } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const getTokens = (): AuthTokens | null => {
  const tokens = localStorage.getItem('auth_tokens');
  return tokens ? JSON.parse(tokens) : null;
};

export const setTokens = (tokens: AuthTokens): void => {
  localStorage.setItem('auth_tokens', JSON.stringify(tokens));
};

export const clearTokens = (): void => {
  localStorage.removeItem('auth_tokens');
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const tokens = getTokens();
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Create a separate instance for token refresh to avoid circular references
const tokenRefreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl: string | undefined = originalRequest?.url;

    // Do not try to refresh/redirect for auth endpoints themselves
    const AUTH_EXCLUDED_PATHS = ['/token/', '/token/refresh/', '/register/'];
    const isAuthEndpoint = AUTH_EXCLUDED_PATHS.some((path) => requestUrl?.includes(path));

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const tokens = getTokens();
      // If it's a login/register call or we have no tokens at all, let the caller handle the error
      if (isAuthEndpoint || !tokens) {
        return Promise.reject(error);
      }

      if (tokens?.refresh) {
        try {
          const response = await tokenRefreshClient.post('/token/refresh/', {
            refresh: tokens.refresh,
          });
          
          const newTokens = { ...tokens, access: response.data.access };
          setTokens(newTokens);
          
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // We had some tokens but no refresh token; treat as unauthenticated and reject
        clearTokens();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
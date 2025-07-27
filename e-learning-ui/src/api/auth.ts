import apiClient from './apiClient';
import { User, AuthTokens, LoginCredentials, RegisterData } from '@/types';

interface LoginResponse {
  tokens: AuthTokens;
  user: User;
}

interface RegisterResponse {
  tokens: AuthTokens;
  user: User;
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Determine if the input is an email (contains @ symbol)
    const isEmail = credentials.usernameOrEmail.includes('@');
    
    // Format credentials for the backend based on whether it's email or username
    const backendCredentials = {
      password: credentials.password,
      ...(isEmail 
        ? { email: credentials.usernameOrEmail } 
        : { username: credentials.usernameOrEmail })
    };
    
    const response = await apiClient.post('/token/', backendCredentials);
    const tokens = response.data;
    
    // Fetch user profile after getting tokens
    apiClient.defaults.headers.Authorization = `Bearer ${tokens.access}`;
    const profileResponse = await apiClient.get('/users/profile/');
    
    return {
      tokens,
      user: profileResponse.data,
    };
  },

  async register(data: RegisterData): Promise<RegisterResponse> {
    const response = await apiClient.post('/users/register/', data);
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get('/users/profile/');
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await apiClient.post('/token/refresh/', {
      refresh: refreshToken,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    // Optionally call backend logout endpoint
    await apiClient.post('/auth/logout/');
  },
};
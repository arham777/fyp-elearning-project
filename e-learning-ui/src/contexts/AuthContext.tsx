import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthTokens, LoginCredentials, RegisterData } from '@/types';
import { getTokens, setTokens, clearTokens } from '@/api/apiClient';
import { authApi } from '@/api/auth';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check for existing token and fetch user profile on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const tokens = getTokens();
      if (tokens?.access) {
        try {
          const userProfile = await authApi.getProfile();
          setUser(userProfile);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          clearTokens();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(credentials);
      setTokens(response.tokens);
      setUser(response.user);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.response?.data?.detail || "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      const user = await authApi.register(data);
      // After registration, perform login flow to get tokens
      const loginResp = await authApi.login({
        usernameOrEmail: data.username || data.email,
        password: data.password,
      });
      setTokens(loginResp.tokens);
      setUser(loginResp.user);
      toast({
        title: "Account created!",
        description: "Welcome to the Learning Management System.",
      });
    } catch (error: any) {
      // Extract human-friendly message from DRF errors
      const data = error?.response?.data;
      let message = data?.detail as string | undefined;
      if (!message && data && typeof data === 'object') {
        try {
          message = Object.values(data).flat().join(' ') as string;
        } catch {
          message = JSON.stringify(data);
        }
      }
      toast({
        title: "Registration failed",
        description: message || "Registration failed",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    // Clear React Query cache to prevent leaking previous user's data
    queryClient.clear();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { User, LoginCredentials, AuthResponse } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = authService.getToken();
        if (token) {
          console.log('🔍 Token found, fetching user profile...');
          const userProfile = await authService.getCurrentUser();
          setUser(userProfile);
          console.log('✅ User authenticated:', userProfile.email);
        } else {
          console.log('❌ No token found');
        }
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        authService.removeToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      console.log('🔑 Starting login process...');
      setIsLoading(true);
      
      const response: AuthResponse = await authService.login(credentials);
      
      // Store token first
      authService.setToken(response.access_token);
      console.log('🔐 Token stored successfully');
      
      // Then update user state
      setUser(response.user);
      console.log('✅ User state updated:', response.user.email);
      
      toast.success(`Welcome back, ${response.user.full_name}!`);
      
      // Add a small delay to ensure state is fully updated
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      setUser(null);
      authService.removeToken();
      
      const errorMessage = error.response?.data?.detail || error.message || 'Login failed. Please try again.';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('🔓 Logging out user...');
    authService.removeToken();
    setUser(null);
    toast.success('Logged out successfully');
  };

  const refreshUser = async () => {
    try {
      console.log('🔄 Refreshing user data...');
      const userProfile = await authService.getCurrentUser();
      setUser(userProfile);
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  );
}
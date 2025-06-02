
import { api } from './api';
import { LoginCredentials, AuthResponse, User } from '../types';

const TOKEN_KEY = 'flood_response_token'; // CONSISTENT with api.ts

class AuthService {
  // Token management - IMPROVED
  getToken(): string | null {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        console.log('🔐 Token retrieved from storage');
        return token;
      }
      console.log('⚠️ No token found in storage');
      return null;
    } catch (error) {
      console.error('❌ Error retrieving token:', error);
      return null;
    }
  }

  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      console.log('🔐 Token stored successfully');
    } catch (error) {
      console.error('❌ Error storing token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  removeToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      console.log('🔓 Token removed from storage');
    } catch (error) {
      console.error('❌ Error removing token:', error);
    }
  }

  // Authentication methods - IMPROVED
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('🔑 Attempting login for:', credentials.email);
      
      // Validate credentials
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      // Make login request
      const response = await api.post('/auth/login-json', {
        email: credentials.email.trim(),
        password: credentials.password,
      });

      console.log('✅ Login successful:', {
        user: response.data.user?.email,
        role: response.data.user?.role,
        hasToken: !!response.data.access_token
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      // Enhanced error handling
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 422) {
        throw new Error('Please check your email and password format');
      } else if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please wait and try again.');
      } else if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Login failed. Please try again.');
      }
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      console.log('👤 Fetching current user profile...');
      
      const token = this.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api.get('/auth/me');
      
      console.log('✅ User profile retrieved:', {
        email: response.data.email,
        role: response.data.role,
        active: response.data.is_active
      });
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get current user:', error);
      
      if (error.response?.status === 401) {
        console.log('🔓 Token invalid - clearing storage');
        this.removeToken();
        throw new Error('Authentication expired. Please log in again.');
      }
      
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('🔓 Logging out...');
      
      // Try to call logout endpoint (optional - may fail if token is invalid)
      try {
        await api.get('/auth/logout');
        console.log('✅ Server logout successful');
      } catch (error) {
        console.warn('⚠️ Server logout failed (token may be invalid):', error);
      }
      
    } finally {
      // Always remove token locally
      this.removeToken();
      console.log('✅ Local logout completed');
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    try {
      console.log('🔄 Refreshing authentication token...');
      
      const response = await api.post('/auth/refresh-token');
      
      console.log('✅ Token refreshed successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error);
      
      // If refresh fails, remove token and force re-login
      this.removeToken();
      throw new Error('Session expired. Please log in again.');
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      console.log('🔒 Changing password...');
      
      if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
      }

      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      console.log('✅ Password changed successfully');
    } catch (error: any) {
      console.error('❌ Password change failed:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Current password is incorrect');
      } else if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else {
        throw new Error('Failed to change password. Please try again.');
      }
    }
  }

  // Utility methods - ENHANCED
  isAuthenticated(): boolean {
    const token = this.getToken();
    const isAuth = !!token;
    console.log('🔍 Authentication check:', isAuth);
    return isAuth;
  }

  hasRole(user: User | null, requiredRoles: string[]): boolean {
    if (!user) {
      console.log('🚫 No user provided for role check');
      return false;
    }
    
    const hasPermission = requiredRoles.includes(user.role);
    console.log('🎭 Role check:', {
      userRole: user.role,
      requiredRoles,
      hasPermission
    });
    
    return hasPermission;
  }

  canManageIncidents(user: User | null): boolean {
    return this.hasRole(user, ['command_center', 'district_officer', 'admin']);
  }

  canManageRescueUnits(user: User | null): boolean {
    return this.hasRole(user, ['command_center', 'admin']);
  }

  canManageFloodZones(user: User | null): boolean {
    return this.hasRole(user, ['district_officer', 'admin']);
  }

  isFieldResponder(user: User | null): boolean {
    return this.hasRole(user, ['field_responder']);
  }

  isCommandCenter(user: User | null): boolean {
    return this.hasRole(user, ['command_center']);
  }

  isDistrictOfficer(user: User | null): boolean {
    return this.hasRole(user, ['district_officer']);
  }

  isAdmin(user: User | null): boolean {
    return this.hasRole(user, ['admin']);
  }

  // Token validation
  async validateToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) {
        return false;
      }

      // Try to get current user - this will validate the token
      await this.getCurrentUser();
      return true;
    } catch (error) {
      console.log('🔍 Token validation failed:', error);
      return false;
    }
  }

  // Auto-refresh token if needed
  async autoRefreshToken(): Promise<boolean> {
    try {
      // Check if token is still valid
      const isValid = await this.validateToken();
      
      if (!isValid) {
        console.log('🔄 Attempting token refresh...');
        await this.refreshToken();
        return true;
      }
      
      return true;
    } catch (error) {
      console.log('❌ Auto-refresh failed:', error);
      this.removeToken();
      return false;
    }
  }

  // Initialize authentication state
  async initializeAuth(): Promise<{ isAuthenticated: boolean; user: User | null }> {
    try {
      console.log('🚀 Initializing authentication...');
      
      const token = this.getToken();
      if (!token) {
        console.log('❌ No token found - user not authenticated');
        return { isAuthenticated: false, user: null };
      }

      // Validate token and get user
      const user = await this.getCurrentUser();
      
      console.log('✅ Authentication initialized successfully');
      return { isAuthenticated: true, user };
    } catch (error) {
      console.error('❌ Authentication initialization failed:', error);
      this.removeToken();
      return { isAuthenticated: false, user: null };
    }
  }

  // Get user role display name
  getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      field_responder: 'Field Responder',
      command_center: 'Command Center',
      district_officer: 'District Officer',
      admin: 'Administrator',
    };
    
    return roleNames[role] || role.replace('_', ' ');
  }

  // Check if user can perform specific actions
  canCreateIncident(user: User | null): boolean {
    // All authenticated users can create incidents
    return !!user;
  }

  canViewAllIncidents(user: User | null): boolean {
    return this.hasRole(user, ['command_center', 'district_officer', 'admin']);
  }

  canAssignUnits(user: User | null): boolean {
    return this.hasRole(user, ['command_center', 'admin']);
  }

  canUpdateIncidentStatus(user: User | null): boolean {
    return this.hasRole(user, ['field_responder', 'command_center', 'admin']);
  }

  canDeleteIncident(user: User | null): boolean {
    return this.hasRole(user, ['admin']);
  }
}

// Create and export singleton instance
export const authService = new AuthService();

// Export default
export default authService;
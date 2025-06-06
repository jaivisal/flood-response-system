import { api } from './api';
import { LoginCredentials, AuthResponse, User, UserRole } from '../types';

const TOKEN_KEY = 'flood_response_token'; // CONSISTENT with api.ts

// Registration interface
export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  department?: string;
  role: UserRole;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
    is_approved: boolean;
    created_at: string;
  };
}

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

  // Registration method - NEW
  async register(credentials: RegisterCredentials): Promise<RegisterResponse> {
    try {
      console.log('📝 Attempting registration for:', credentials.email);
      
      // Validate credentials
      if (!credentials.email || !credentials.password || !credentials.full_name || !credentials.role) {
        throw new Error('Email, password, full name, and role are required');
      }

      if (credentials.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Make registration request
      const response = await api.post('/auth/register', {
        email: credentials.email.trim(),
        password: credentials.password,
        full_name: credentials.full_name.trim(),
        phone_number: credentials.phone_number?.trim() || undefined,
        department: credentials.department?.trim() || undefined,
        role: credentials.role,
      });

      console.log('✅ Registration successful:', {
        user: response.data.user?.email,
        role: response.data.user?.role,
        approved: response.data.user?.is_approved
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      
      // Enhanced error handling
      if (error.response?.status === 400) {
        throw new Error('Email already exists or invalid data provided');
      } else if (error.response?.status === 422) {
        const validationErrors = error.response.data?.detail;
        if (validationErrors && Array.isArray(validationErrors)) {
          const errorMessages = validationErrors.map((err: any) => 
            `${err.loc?.join('.')}: ${err.msg}`
          ).join(', ');
          throw new Error(`Validation Error: ${errorMessages}`);
        }
        throw new Error('Please check your input data');
      } else if (error.response?.status === 429) {
        throw new Error('Too many registration attempts. Please wait and try again.');
      } else if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Registration failed. Please try again.');
      }
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
      } else if (error.response?.status === 403) {
        throw new Error('Account not approved yet. Please wait for administrator approval.');
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

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
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

  // Account management methods - NEW
  async requestPasswordReset(email: string): Promise<void> {
    try {
      console.log('🔄 Requesting password reset for:', email);
      
      if (!email) {
        throw new Error('Email is required');
      }

      await api.post('/auth/request-password-reset', { email: email.trim() });
      
      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Password reset request failed:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Email address not found');
      } else if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else {
        throw new Error('Failed to send password reset email');
      }
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      console.log('🔒 Resetting password with token...');
      
      if (!token || !newPassword) {
        throw new Error('Reset token and new password are required');
      }

      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      await api.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });

      console.log('✅ Password reset successful');
    } catch (error: any) {
      console.error('❌ Password reset failed:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Invalid or expired reset token');
      } else if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else {
        throw new Error('Failed to reset password');
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

  // Role-based permission checks
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

  canApproveUsers(user: User | null): boolean {
    return this.hasRole(user, ['admin']);
  }

  canManageUsers(user: User | null): boolean {
    return this.hasRole(user, ['admin']);
  }

  // Account status checks
  isAccountApproved(user: User | null): boolean {
    return !!(user && (user as any).is_approved !== false);
  }

  isAccountActive(user: User | null): boolean {
    return !!(user && user.is_active);
  }

  // Validation helpers
  isValidEmail(email: string): boolean {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(email);
  }

  isValidPassword(password: string): boolean {
    return password.length >= 8;
  }

  isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^[+]?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  // Password strength calculator
  calculatePasswordStrength(password: string): {
    score: number;
    label: string;
    suggestions: string[];
  } {
    if (!password) {
      return { score: 0, label: 'No password', suggestions: ['Enter a password'] };
    }

    let score = 0;
    const suggestions: string[] = [];

    if (password.length >= 8) {
      score++;
    } else {
      suggestions.push('Use at least 8 characters');
    }

    if (/[a-z]/.test(password)) {
      score++;
    } else {
      suggestions.push('Add lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      score++;
    } else {
      suggestions.push('Add uppercase letters');
    }

    if (/[0-9]/.test(password)) {
      score++;
    } else {
      suggestions.push('Add numbers');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    } else {
      suggestions.push('Add special characters');
    }

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const label = labels[score - 1] || 'Very Weak';

    return { score, label, suggestions };
  }
}

// Create and export singleton instance
export const authService = new AuthService();

// Export default
export default authService;
import { api } from './api';
import { LoginCredentials, AuthResponse, User } from '../types';

const TOKEN_KEY = 'flood_response_token';

class AuthService {
  // Token management
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login-json', credentials);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await api.get('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.removeToken();
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await api.post('/auth/refresh-token');
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasRole(user: User | null, requiredRoles: string[]): boolean {
    if (!user) return false;
    return requiredRoles.includes(user.role);
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
}

export const authService = new AuthService();
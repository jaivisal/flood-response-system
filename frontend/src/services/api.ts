/*
Updated API service with better token handling
frontend/src/services/api.ts - FIXED VERSION
*/

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token - FIXED VERSION
api.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('flood_response_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Adding token to request:', config.url); // Debug log
    } else if (!token) {
      console.log('⚠️ No token found for request:', config.url); // Debug log
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling - IMPROVED VERSION
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    console.log('🔍 API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
    });

    // Handle different error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - check if it's a token issue
          console.log('🔐 401 Unauthorized - checking token...');
          const token = localStorage.getItem('flood_response_token');
          if (!token) {
            console.log('❌ No token found');
            toast.error('Please log in to continue');
          } else {
            console.log('⚠️ Token present but request failed - may be expired');
            localStorage.removeItem('flood_response_token');
            toast.error('Session expired. Please log in again.');
          }
          
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }
          break;
          
        case 403:
          toast.error('Access denied. Insufficient permissions.');
          break;
          
        case 404:
          toast.error('Resource not found.');
          break;
          
        case 422:
          // Validation errors
          if (data.detail && Array.isArray(data.detail)) {
            const errors = data.detail.map((err: any) => err.msg).join(', ');
            toast.error(`Validation error: ${errors}`);
          } else {
            toast.error('Invalid data provided.');
          }
          break;
          
        case 429:
          toast.error('Too many requests. Please slow down.');
          break;
          
        case 500:
          toast.error('Server error. Please try again later.');
          break;
          
        default:
          const errorMessage = data?.detail || data?.message || 'An error occurred';
          toast.error(errorMessage);
      }
    } else if (error.request) {
      // Network error
      console.error('🌐 Network error:', error.request);
      toast.error('Network error. Please check your connection.');
    } else {
      // Other error
      console.error('❌ Unexpected error:', error.message);
      toast.error('An unexpected error occurred.');
    }
    
    return Promise.reject(error);
  }
);

// API service methods
class ApiService {
  // Generic CRUD operations
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    console.log('📡 GET request to:', url);
    const response = await api.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    console.log('📡 POST request to:', url);
    const response = await api.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    console.log('📡 PUT request to:', url);
    const response = await api.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    console.log('📡 PATCH request to:', url);
    const response = await api.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    console.log('📡 DELETE request to:', url);
    const response = await api.delete(url, config);
    return response.data;
  }

  // File upload
  async uploadFile(url: string, file: File, onUploadProgress?: (progressEvent: any) => void): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });

    return response.data;
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await api.get(url, {
      responseType: 'blob',
    });

    // Create blob link to download
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.get('/health');
  }

  // Test connectivity
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Check authentication status
  async checkAuth(): Promise<boolean> {
    try {
      await this.get('/auth/me');
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const apiService = new ApiService();

// Export commonly used methods
export const { get, post, put, patch, delete: del } = apiService;

export default api;
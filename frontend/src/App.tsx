import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import RescueUnitsPage from './pages/RescueUnitsPage';
import FloodZonesPage from './pages/FloodZonesPage';
import AnalyticsPage from './pages/AnalyticsPage';

// Components
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/Common/LoadingSpinner';

// Styles
import './index.css';

// Create a client with enhanced configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 errors
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

function AppRoutes() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Emergency Response System</h2>
          <p className="text-blue-200">Initializing secure connection...</p>
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          !isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />
        } 
      />
      
      <Route 
        path="/register" 
        element={
          !isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" replace />
        } 
      />
      
      {/* Protected Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Default redirect to dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Main Dashboard - Accessible to all authenticated users */}
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* Incidents Management - Accessible to all authenticated users */}
        <Route path="incidents" element={<IncidentsPage />} />
        
        {/* Rescue Units - Command Center and Admin only */}
        <Route 
          path="rescue-units" 
          element={
            <ProtectedRoute requiredRoles={['command_center', 'admin']}>
              <RescueUnitsPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Flood Zones - District Officer and Admin only */}
        <Route 
          path="flood-zones" 
          element={
            <ProtectedRoute requiredRoles={['district_officer', 'admin']}>
              <FloodZonesPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Analytics - Command Center, District Officer, and Admin */}
        <Route 
          path="analytics" 
          element={
            <ProtectedRoute requiredRoles={['command_center', 'district_officer', 'admin']}>
              <AnalyticsPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Reports - Command Center, District Officer, and Admin */}
        <Route 
          path="reports" 
          element={
            <ProtectedRoute requiredRoles={['command_center', 'district_officer', 'admin']}>
              <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Reports Coming Soon</h2>
                  <p className="text-gray-300">Advanced reporting features are under development</p>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* User Management - Admin only */}
        <Route 
          path="users" 
          element={
            <ProtectedRoute requiredRoles={['admin']}>
              <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">User Management</h2>
                  <p className="text-gray-300">User administration panel coming soon</p>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* Settings - Admin only */}
        <Route 
          path="settings" 
          element={
            <ProtectedRoute requiredRoles={['admin']}>
              <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⚙️</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">System Settings</h2>
                  <p className="text-gray-300">Configuration panel under development</p>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* 404 - Catch all route */}
      <Route 
        path="*" 
        element={
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">🚫</span>
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">404</h1>
              <h2 className="text-xl font-semibold text-gray-200 mb-4">Page Not Found</h2>
              <p className="text-gray-400 mb-6">
                The page you're looking for doesn't exist or you don't have permission to access it.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.history.back()}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full px-6 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors border border-white/20"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <AppRoutes />
            
            {/* Enhanced Toast Notifications */}
            <Toaster 
              position="top-right"
              containerStyle={{
                top: 20,
                right: 20,
              }}
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(17, 24, 39, 0.95)',
                  color: '#ffffff',
                  border: '1px solid rgba(75, 85, 99, 0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  fontSize: '14px',
                  fontWeight: '500',
                  maxWidth: '400px',
                },
                success: {
                  duration: 3000,
                  style: {
                    background: 'rgba(5, 150, 105, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#ffffff',
                  },
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#ffffff',
                  },
                },
                error: {
                  duration: 5000,
                  style: {
                    background: 'rgba(220, 38, 38, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ffffff',
                  },
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#ffffff',
                  },
                },
                loading: {
                  style: {
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                    color: '#ffffff',
                  },
                  iconTheme: {
                    primary: '#3b82f6',
                    secondary: '#ffffff',
                  },
                },
                // Custom styles for different notification types
                custom: {
                  style: {
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(167, 139, 250, 0.3)',
                    color: '#ffffff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Waves, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  Shield, 
  Activity,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  Info,
  Bell
} from 'lucide-react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ErrorBoundary } from 'react-error-boundary';

// Lazy load pages for better performance
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const IncidentsPage = React.lazy(() => import('./pages/IncidentsPage'));
const RescueUnitsPage = React.lazy(() => import('./pages/RescueUnitsPage'));
const FloodZonesPage = React.lazy(() => import('./pages/FloodZonesPage'));

// Components
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/Layout/Layout';

// Styles
import './index.css';

// Enhanced Query Client with better configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});

// Enhanced Loading Component
const AppLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="relative w-24 h-24 mx-auto mb-8">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
        {/* Spinning ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent"
        />
        {/* Inner pulse */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-4 bg-blue-500/20 rounded-full"
        />
        {/* Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Waves className="w-10 h-10 text-blue-400" />
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold text-white mb-2">Emergency Response System</h2>
        <p className="text-blue-200 mb-4">Initializing secure connection...</p>
        
        <div className="flex items-center justify-center space-x-2 text-sm text-blue-300">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 bg-blue-400 rounded-full"
          />
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            className="w-2 h-2 bg-blue-400 rounded-full"
          />
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            className="w-2 h-2 bg-blue-400 rounded-full"
          />
        </div>
      </motion.div>
    </motion.div>
  </div>
);

// Enhanced Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-red-500/30 p-8 max-w-md w-full text-center"
    >
      <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-4">System Error</h2>
      <p className="text-red-100 mb-6">
        The emergency response system encountered an unexpected error.
      </p>
      
      <details className="text-left mb-6">
        <summary className="cursor-pointer text-red-200 hover:text-white transition-colors mb-2">
          Technical Details
        </summary>
        <div className="bg-black/20 rounded-lg p-3 text-xs text-red-100 font-mono">
          {error.message}
        </div>
      </details>
      
      <div className="flex space-x-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={resetErrorBoundary}
          className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Restart System
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => window.location.reload()}
          className="flex-1 px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl transition-colors"
        >
          Reload Page
        </motion.button>
      </div>
      
      <div className="mt-6 text-xs text-red-200">
        If this problem persists, contact system administrator
      </div>
    </motion.div>
  </div>
);

// Network Status Component
const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      setTimeout(() => setShowOfflineMessage(false), 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showOfflineMessage && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3">
            <WifiOff className="w-5 h-5" />
            <span className="font-medium">Connection lost - Working offline</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Page Transition Wrapper
const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Main App Routes Component
function AppRoutes() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <AppLoader />;
  }

  return (
    <PageTransition>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? (
              <Suspense fallback={<AppLoader />}>
                <LoginPage />
              </Suspense>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          } 
        />
        
        <Route 
          path="/register" 
          element={
            !isAuthenticated ? (
              <Suspense fallback={<AppLoader />}>
                <RegisterPage />
              </Suspense>
            ) : (
              <Navigate to="/dashboard" replace />
            )
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
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          <Route 
            path="dashboard" 
            element={
              <Suspense fallback={<AppLoader />}>
                <DashboardPage />
              </Suspense>
            } 
          />
          
          <Route 
            path="incidents" 
            element={
              <Suspense fallback={<AppLoader />}>
                <IncidentsPage />
              </Suspense>
            } 
          />
          
          <Route 
            path="rescue-units" 
            element={
              <ProtectedRoute requiredRoles={['command_center', 'admin']}>
                <Suspense fallback={<AppLoader />}>
                  <RescueUnitsPage />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="flood-zones" 
            element={
              <ProtectedRoute requiredRoles={['district_officer', 'admin']}>
                <Suspense fallback={<AppLoader />}>
                  <FloodZonesPage />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          
          {/* Additional routes can be added here */}
          <Route 
            path="analytics" 
            element={
              <ProtectedRoute requiredRoles={['command_center', 'district_officer', 'admin']}>
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Activity className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                    <h2 className="text-2xl font-bold mb-2">Analytics Dashboard</h2>
                    <p className="text-blue-200">Coming Soon - Advanced analytics and reporting</p>
                  </div>
                </div>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="reports" 
            element={
              <ProtectedRoute requiredRoles={['command_center', 'district_officer', 'admin']}>
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-green-400" />
                    <h2 className="text-2xl font-bold mb-2">Reports Center</h2>
                    <p className="text-blue-200">Coming Soon - Comprehensive reporting system</p>
                  </div>
                </div>
              </ProtectedRoute>
            } 
          />
        </Route>

        {/* 404 Route */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center text-white"
              >
                <div className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-red-400" />
                </div>
                <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
                <p className="text-blue-200 mb-6">The requested page could not be found in the emergency system.</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.location.href = '/dashboard'}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                  Return to Dashboard
                </motion.button>
              </motion.div>
            </div>
          } 
        />
      </Routes>
    </PageTransition>
  );
}

// Enhanced Toast Configuration
const ToastConfig = () => (
  <Toaster 
    position="top-right"
    containerStyle={{
      top: 20,
      right: 20,
    }}
    toastOptions={{
      duration: 4000,
      style: {
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: '500',
      },
      success: {
        duration: 3000,
        style: {
          background: 'rgba(34, 197, 94, 0.9)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#22c55e',
        },
      },
      error: {
        duration: 5000,
        style: {
          background: 'rgba(239, 68, 68, 0.9)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#ef4444',
        },
      },
      loading: {
        style: {
          background: 'rgba(59, 130, 246, 0.9)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        },
      },
    }}
  />
);

// Service Worker Registration (Optional)
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Application Performance Monitoring
const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Monitor page load performance
    if ('performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            console.log('Page load time:', entry.duration);
          }
        }
      });
      observer.observe({ entryTypes: ['navigation'] });
    }

    // Monitor query client cache
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'queryAdded') {
        console.log('Query cached:', event.query.queryKey);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
};

// Main App Component
function App() {
  usePerformanceMonitoring();

  useEffect(() => {
    registerServiceWorker();
    
    // Add global error handler
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('App Error Boundary:', error, errorInfo);
      }}
      onReset={() => {
        // Clear query cache on reset
        queryClient.clear();
        window.location.reload();
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <div className="App">
              <NetworkStatus />
              <AppRoutes />
              <ToastConfig />
            </div>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
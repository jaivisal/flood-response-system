// frontend/src/components/Auth/LoginForm.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Shield, User, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { LoginCredentials } from '../../types';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  className?: string;
}

export default function LoginForm({ onSuccess, onForgotPassword, className = '' }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<LoginFormData>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Watch form values for real-time validation feedback
  const email = watch('email');
  const password = watch('password');

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      
      const credentials: LoginCredentials = {
        email: data.email,
        password: data.password,
      };

      await login(credentials);
      
      // Handle remember me functionality
      if (data.rememberMe) {
        localStorage.setItem('remember_email', data.email);
      } else {
        localStorage.removeItem('remember_email');
      }

      toast.success('Login successful!');
      onSuccess?.();
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific error types
      if (error.response?.status === 401) {
        toast.error('Invalid email or password');
      } else if (error.response?.status === 423) {
        toast.error('Account is locked. Please contact administrator.');
      } else if (error.response?.status === 429) {
        toast.error('Too many login attempts. Please try again later.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered email on component mount
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('remember_email');
    if (rememberedEmail) {
      setValue('email', rememberedEmail);
      setValue('rememberMe', true);
    }
  }, [setValue]);

  // Demo account quick-fill functions
  const fillDemoAccount = (role: string) => {
    const demoAccounts = {
      responder: { email: 'responder@demo.com', password: 'demo123' },
      command: { email: 'command@demo.com', password: 'demo123' },
      officer: { email: 'officer@demo.com', password: 'demo123' },
      admin: { email: 'admin@demo.com', password: 'demo123' },
    };

    const account = demoAccounts[role as keyof typeof demoAccounts];
    if (account) {
      setValue('email', account.email);
      setValue('password', account.password);
      toast.success(`Demo ${role} account loaded`);
    }
  };

  // Validation helpers
  const getFieldError = (fieldName: keyof LoginFormData) => {
    return errors[fieldName]?.message;
  };

  const getFieldStatus = (fieldName: keyof LoginFormData, value: string) => {
    if (!value) return 'default';
    if (errors[fieldName]) return 'error';
    return 'success';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-full max-w-md ${className}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Field */}
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className={`h-5 w-5 ${
                getFieldStatus('email', email) === 'error' ? 'text-red-400' :
                getFieldStatus('email', email) === 'success' ? 'text-green-400' :
                'text-gray-400'
              }`} />
            </div>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Please enter a valid email address',
                },
              })}
              type="email"
              id="email"
              autoComplete="email"
              className={`block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                getFieldStatus('email', email) === 'error'
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : getFieldStatus('email', email) === 'success'
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder="Enter your email"
              disabled={isLoading}
            />
            {getFieldStatus('email', email) === 'success' && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
            )}
          </div>
          {getFieldError('email') && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-600 flex items-center"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              {getFieldError('email')}
            </motion.p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className={`h-5 w-5 ${
                getFieldStatus('password', password) === 'error' ? 'text-red-400' :
                getFieldStatus('password', password) === 'success' ? 'text-green-400' :
                'text-gray-400'
              }`} />
            </div>
            <input
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              className={`block w-full pl-10 pr-12 py-3 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                getFieldStatus('password', password) === 'error'
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : getFieldStatus('password', password) === 'success'
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
              placeholder="Enter your password"
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              {getFieldStatus('password', password) === 'success' && !showPassword && (
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              )}
              <button
                type="button"
                className="pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>
          {getFieldError('password') && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-600 flex items-center"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              {getFieldError('password')}
            </motion.p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              {...register('rememberMe')}
              id="rememberMe"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>

          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
            disabled={isLoading}
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
          type="submit"
          disabled={isLoading || !isValid}
          className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white transition-all duration-200 ${
            isLoading || !isValid
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg hover:shadow-xl'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Signing in...
            </div>
          ) : (
            <div className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Sign in to Emergency Center
            </div>
          )}
        </motion.button>

        {/* Demo Accounts Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600 mb-3">
            Quick Demo Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('responder')}
              className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              <span className="text-red-500 mr-1">🚨</span>
              Field Responder
            </button>
            
            <button
              type="button"
              onClick={() => fillDemoAccount('command')}
              className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              <span className="text-blue-500 mr-1">🎯</span>
              Command Center
            </button>
            
            <button
              type="button"
              onClick={() => fillDemoAccount('officer')}
              className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              <span className="text-green-500 mr-1">🏛️</span>
              District Officer
            </button>
            
            <button
              type="button"
              onClick={() => fillDemoAccount('admin')}
              className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              <span className="text-purple-500 mr-1">⚙️</span>
              Admin
            </button>
          </div>
          
          <p className="text-center text-xs text-gray-500 mt-2">
            All demo accounts use password: <code className="bg-gray-100 px-1 rounded">demo123</code>
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 font-medium">Secure Authentication</p>
              <p className="text-blue-700 mt-1">
                Your credentials are protected with industry-standard encryption and secure token-based authentication.
              </p>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}

// Additional utility components for enhanced UX

// Password Strength Indicator Component
export function PasswordStrengthIndicator({ password }: { password: string }) {
  const getStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const strength = getStrength(password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex space-x-1 mb-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${
              i < strength ? strengthColors[strength - 1] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600">
        Password strength: <span className="font-medium">{strengthLabels[strength - 1] || 'Very Weak'}</span>
      </p>
    </div>
  );
}

// Two-Factor Authentication Component (for future enhancement)
export function TwoFactorAuth({ onVerify }: { onVerify: (code: string) => void }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  
  const handleCodeChange = (index: number, value: string) => {
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
    
    // Verify when all digits entered
    if (newCode.every(digit => digit) && newCode.join('').length === 6) {
      onVerify(newCode.join(''));
    }
  };

  return (
    <div className="text-center">
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Two-Factor Authentication
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Enter the 6-digit code from your authenticator app
      </p>
      
      <div className="flex justify-center space-x-2 mb-4">
        {code.map((digit, index) => (
          <input
            key={index}
            id={`code-${index}`}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            className="w-12 h-12 text-center text-lg font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        ))}
      </div>
      
      <button className="text-sm text-blue-600 hover:text-blue-500">
        Didn't receive a code? Resend
      </button>
    </div>
  );
}
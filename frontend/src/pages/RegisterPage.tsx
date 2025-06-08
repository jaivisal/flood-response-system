import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { 
  Eye, 
  EyeOff, 
  Shield, 
  Waves, 
  AlertTriangle, 
  Activity, 
  User, 
  Mail, 
  Phone, 
  Building,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

import { apiService } from '../services/api';
import { UserRole } from '../types';
import { authService } from '../services/auth';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  phone_number?: string;
  department?: string;
  role: UserRole;
  terms_accepted: boolean;
}

interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  department?: string;
  role: UserRole;
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterFormData>({
    mode: 'onChange',
    defaultValues: {
      role: 'field_responder',
      terms_accepted: false,
    },
  });

  const password = watch('password');
  const email = watch('email');

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      
      const registerData: RegisterRequest = {
        email: data.email.trim(),
        password: data.password,
        full_name: data.full_name.trim(),
        phone_number: data.phone_number?.trim() || undefined,
        department: data.department?.trim() || undefined,
        role: data.role,
      };

      console.log('🆕 Registering user:', { ...registerData, password: '[REDACTED]' });

      const response = await apiService.post('/auth/register', registerData);
      
      console.log('✅ Registration successful:', response);
      
      toast.success('Registration successful! Please wait for account approval.');
      
      // Redirect to login page
      navigate('/login', { 
        state: { 
          message: 'Registration successful! Please wait for administrator approval before logging in.',
          email: data.email 
        } 
      });
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      
      if (error.response?.status === 400) {
        toast.error('Email already exists or invalid data provided');
      } else if (error.response?.status === 422) {
        const validationErrors = error.response.data?.detail;
        if (validationErrors && Array.isArray(validationErrors)) {
          const errorMessages = validationErrors.map((err: any) => 
            `${err.loc?.join('.')}: ${err.msg}`
          ).join(', ');
          toast.error(`Validation Error: ${errorMessages}`);
        } else {
          toast.error('Invalid data provided. Please check all fields.');
        }
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];
    
    return {
      score,
      label: labels[score - 1] || 'Very Weak',
      color: colors[score - 1] || 'bg-gray-300',
      percentage: (score / 5) * 100,
    };
  };

  const passwordStrength = getPasswordStrength(password);

  const roleOptions = [
    {
      value: 'field_responder',
      label: 'Field Responder',
      description: 'Emergency response personnel on the ground',
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
    },
    {
      value: 'command_center',
      label: 'Command Center',
      description: 'Central coordination and dispatch',
      icon: <Activity className="w-5 h-5 text-blue-600" />,
    },
    {
      value: 'district_officer',
      label: 'District Officer',
      description: 'Local government official',
      icon: <Building className="w-5 h-5 text-green-600" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Background animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-2xl w-full space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex justify-center items-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg">
              <Waves className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Join Emergency Response Team
          </h2>
          <p className="text-blue-100">
            Register for the Flood Management & Coordination System
          </p>
        </motion.div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    {...register('full_name', {
                      required: 'Full name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                    })}
                    type="text"
                    className={`appearance-none rounded-lg relative block w-full px-3 py-3 border ${
                      errors.full_name ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                    placeholder="Enter your full name"
                  />
                  {errors.full_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    {...register('phone_number', {
                      pattern: {
                        value: /^[+]?[\d\s-()]{10,}$/,
                        message: 'Please enter a valid phone number',
                      },
                    })}
                    type="tel"
                    className={`appearance-none rounded-lg relative block w-full px-3 py-3 border ${
                      errors.phone_number ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                    placeholder="+91 98765 43210"
                  />
                  {errors.phone_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
                  )}
                </div>
              </div>

              {/* Department */}
              <div className="mt-4">
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department/Organization
                </label>
                <input
                  {...register('department')}
                  type="text"
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="e.g., Tamil Nadu Fire Service, District Collector Office"
                />
              </div>
            </div>

            {/* Account Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-600" />
                Account Information
              </h3>

              {/* Email */}
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  type="email"
                  className={`appearance-none rounded-lg relative block w-full px-3 py-3 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters',
                        },
                      })}
                      type={showPassword ? 'text' : 'password'}
                      className={`appearance-none rounded-lg relative block w-full px-3 py-3 pr-10 border ${
                        errors.password ? 'border-red-300' : 'border-gray-300'
                      } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex space-x-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded ${
                              i < passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-600">
                        Password strength: <span className="font-medium">{passwordStrength.label}</span>
                      </p>
                    </div>
                  )}
                  
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (value) => value === password || 'Passwords do not match',
                      })}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`appearance-none rounded-lg relative block w-full px-3 py-3 pr-10 border ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Your Role *
              </h3>
              <div className="space-y-3">
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    className="relative flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <input
                      {...register('role', { required: 'Please select a role' })}
                      type="radio"
                      value={option.value}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-1"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center">
                        {option.icon}
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {option.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Submit button */}
            <div>
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
                    Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Create Emergency Response Account
                  </div>
                )}
              </motion.button>
            </div>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>

        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-blue-100 text-sm"
        >
          <p>Emergency Response System</p>
          <p className="mt-1">Secure registration for authorized personnel only</p>
        </motion.div>
      </div>
    </div>
  );
}
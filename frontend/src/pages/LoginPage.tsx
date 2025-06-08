import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { 
  Eye, 
  EyeOff, 
  Shield, 
  Waves, 
  AlertTriangle, 
  Activity, 
  UserPlus,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Droplets,
  MapPin,
  Users,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../hooks/useAuth';
import { LoginCredentials } from '../types';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [currentStats, setCurrentStats] = useState({ incidents: 247, units: 89, response: '12.3m' });
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';
  const registrationMessage = (location.state as any)?.message;
  const emailFromRegistration = (location.state as any)?.email;

  // Debug logging
  console.log('LoginPage: from =', from);
  console.log('LoginPage: registrationMessage =', registrationMessage);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    mode: 'onChange',
    defaultValues: {
      email: emailFromRegistration || '',
      password: '',
    },
  });

  const email = watch('email');
  const password = watch('password');

  // Animate stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStats(prev => ({
        incidents: prev.incidents + Math.floor(Math.random() * 3) - 1,
        units: prev.units + Math.floor(Math.random() * 3) - 1,
        response: (parseFloat(prev.response) + (Math.random() * 0.2 - 0.1)).toFixed(1) + 'm'
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (emailFromRegistration) {
      setValue('email', emailFromRegistration);
    }
  }, [emailFromRegistration, setValue]);

  const onSubmit = async (data: LoginFormData) => {
    console.log('🚀 Login form submitted:', { email: data.email });
    
    try {
      setIsLoading(true);
      
      // Call login function and wait for completion
      await login(data);
      console.log('✅ Login successful, navigating to:', from);
      
      // Use setTimeout to ensure state updates have completed
      setTimeout(() => {
        console.log('🧭 Executing navigation to:', from);
        navigate(from, { replace: true });
      }, 100);
      
    } catch (error) {
      console.error('❌ Login error in form:', error);
      // Error handling is done in useAuth hook
      setIsLoading(false);
    }
  };

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
      console.log('🎭 Filling demo account:', role, account);
      setValue('email', account.email, { shouldValidate: true });
      setValue('password', account.password, { shouldValidate: true });
      toast.success(`Demo ${role} account loaded - ready to sign in!`);
    }
  };

  // Auto-login function for demo accounts
  const loginDemoAccount = async (role: string) => {
    const demoAccounts = {
      responder: { email: 'responder@demo.com', password: 'demo123' },
      command: { email: 'command@demo.com', password: 'demo123' },
      officer: { email: 'officer@demo.com', password: 'demo123' },
      admin: { email: 'admin@demo.com', password: 'demo123' },
    };

    const account = demoAccounts[role as keyof typeof demoAccounts];
    if (account) {
      console.log('🚀 Auto-logging in demo account:', role);
      toast.loading(`Signing in as ${role}...`, { id: 'demo-login' });
      
      try {
        setIsLoading(true);
        await login(account);
        
        toast.success(`Welcome, Demo ${role}!`, { id: 'demo-login' });
        
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 100);
        
      } catch (error) {
        console.error('❌ Demo login failed:', error);
        toast.error(`Demo ${role} login failed`, { id: 'demo-login' });
        setIsLoading(false);
      }
    }
  };

  // Field validation status
  const getFieldStatus = (fieldName: keyof LoginFormData, value: string) => {
    if (!value) return 'default';
    if (errors[fieldName]) return 'error';
    return 'success';
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating Orbs */}
        <motion.div
          animate={{ 
            x: [0, 100, 0],
            y: [0, -100, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, -150, 0],
            y: [0, 100, 0],
            scale: [1, 0.8, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, 80, 0],
            y: [0, -80, 0],
            scale: [1, 1.5, 1]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"
        />

        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        
        {/* Floating Icons */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                opacity: 0.1
              }}
              animate={{
                y: [null, -100, null],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 2
              }}
              className="absolute text-blue-400/20"
            >
              {i % 4 === 0 && <Droplets className="w-8 h-8" />}
              {i % 4 === 1 && <Shield className="w-8 h-8" />}
              {i % 4 === 2 && <Activity className="w-8 h-8" />}
              {i % 4 === 3 && <MapPin className="w-8 h-8" />}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding & Info */}
        <div className="hidden lg:flex lg:w-1/2 relative">
          <div className="flex flex-col justify-between p-12 w-full">
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="flex items-center space-x-3"
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
                  <Waves className="w-6 h-6 text-white" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center"
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </motion.div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">FloodResponse</h1>
                <p className="text-blue-200 text-sm">Emergency Management System</p>
              </div>
            </motion.div>

            {/* Main Content */}
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <h2 className="text-5xl font-bold text-white leading-tight mb-6">
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    Emergency Response
                  </span>
                  in Real-Time
                </h2>
                <p className="text-xl text-blue-100 leading-relaxed">
                  Advanced flood management and coordination platform for emergency responders,
                  command centers, and district officials.
                </p>
              </motion.div>

              {/* Live Stats */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="grid grid-cols-3 gap-6"
              >
                <div className="text-center">
                  <motion.div
                    key={currentStats.incidents}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-bold text-cyan-400"
                  >
                    {currentStats.incidents}
                  </motion.div>
                  <div className="text-sm text-blue-200">Active Incidents</div>
                </div>
                <div className="text-center">
                  <motion.div
                    key={currentStats.units}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-bold text-green-400"
                  >
                    {currentStats.units}
                  </motion.div>
                  <div className="text-sm text-blue-200">Available Units</div>
                </div>
                <div className="text-center">
                  <motion.div
                    key={currentStats.response}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-bold text-orange-400"
                  >
                    {currentStats.response}
                  </motion.div>
                  <div className="text-sm text-blue-200">Response Time</div>
                </div>
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="space-y-4"
              >
                {[
                  { icon: MapPin, text: "Real-time incident mapping" },
                  { icon: Users, text: "Multi-role coordination" },
                  { icon: Clock, text: "Rapid response dispatch" }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ x: 10 }}
                    className="flex items-center space-x-3 text-blue-100"
                  >
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <feature.icon className="w-4 h-4" />
                    </div>
                    <span>{feature.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="text-blue-300 text-sm"
            >
              <p>&copy; 2024 JAIV. Built for emergency management excellence.</p>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:hidden text-center mb-8"
            >
              <div className="flex justify-center items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-xl">
                  <Waves className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-blue-200">Sign in to Emergency Response System</p>
            </motion.div>

            {/* Registration Success Message */}
            <AnimatePresence>
              {registrationMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.6 }}
                  className="mb-6 p-4 bg-green-500/10 border border-green-400/20 rounded-xl backdrop-blur-sm"
                >
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-green-300 font-medium">Registration Successful!</p>
                      <p className="text-green-200 mt-1">{registrationMessage}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Form Background */}
              <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl" />
              
              <div className="relative z-10 p-8">
                <div className="hidden lg:block text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Welcome Back</h3>
                  <p className="text-blue-200">Sign in to your emergency response account</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-blue-100">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address',
                          },
                        })}
                        type="email"
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-blue-200 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 ${
                          errors.email ? 'border-red-400/50' : 
                          getFieldStatus('email', email) === 'success' ? 'border-green-400/50' : 
                          'border-white/20'
                        }`}
                        placeholder="Enter your email"
                      />
                      
                      {/* Field Status Indicator */}
                      <AnimatePresence>
                        {email && !errors.email && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Focus Glow Effect */}
                      <AnimatePresence>
                        {focusedField === 'email' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 rounded-xl bg-blue-400/10 border border-blue-400/30 pointer-events-none"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <AnimatePresence>
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-red-400 flex items-center"
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {errors.email.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium text-blue-100">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters',
                          },
                        })}
                        type={showPassword ? 'text' : 'password'}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className={`w-full px-4 py-3 pr-12 bg-white/10 border rounded-xl text-white placeholder-blue-200 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 ${
                          errors.password ? 'border-red-400/50' : 
                          getFieldStatus('password', password) === 'success' ? 'border-green-400/50' : 
                          'border-white/20'
                        }`}
                        placeholder="Enter your password"
                      />
                      
                      {/* Password Toggle & Status */}
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                        {password && !errors.password && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          </motion.div>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 text-blue-200 hover:text-white transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </motion.button>
                      </div>

                      {/* Focus Glow Effect */}
                      <AnimatePresence>
                        {focusedField === 'password' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 rounded-xl bg-blue-400/10 border border-blue-400/30 pointer-events-none"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <AnimatePresence>
                      {errors.password && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-sm text-red-400 flex items-center"
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {errors.password.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <motion.button
                      whileHover={{ scale: isLoading ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading ? 1 : 0.98 }}
                      type="submit"
                      disabled={isLoading}
                      className={`group relative w-full flex items-center justify-center px-6 py-4 rounded-xl text-white font-semibold transition-all duration-300 ${
                        isLoading
                          ? 'bg-gray-500/50 cursor-not-allowed'
                          : email && password
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg hover:shadow-xl'
                          : 'bg-gray-500/70 cursor-not-allowed'
                      }`}
                    >
                      {/* Button Background Effect */}
                      {!isLoading && email && password && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                          animate={{ 
                            background: [
                              'linear-gradient(90deg, #3b82f6, #06b6d4)',
                              'linear-gradient(90deg, #06b6d4, #3b82f6)',
                              'linear-gradient(90deg, #3b82f6, #06b6d4)'
                            ]
                          }}
                          transition={{ duration: 3, repeat: Infinity }}
                        />
                      )}
                      
                      <div className="relative flex items-center">
                        {isLoading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-3"
                            />
                            Signing In...
                          </>
                        ) : (
                          <>
                            <Shield className="w-5 h-5 mr-3" />
                            Sign In to Emergency Center
                            <motion.div
                              animate={{ x: [0, 5, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <ArrowRight className="w-5 h-5 ml-3" />
                            </motion.div>
                          </>
                        )}
                      </div>
                    </motion.button>
                  </div>
                </form>

                {/* Registration Link */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 text-center"
                >
                  <p className="text-blue-200">
                    Don't have an account?{' '}
                    <Link
                      to="/register"
                      className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center group"
                    >
                      <UserPlus className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" />
                      Register as Emergency Personnel
                    </Link>
                  </p>
                </motion.div>

                {/* Demo Accounts */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 pt-6 border-t border-white/10"
                >
                  <div className="flex items-center justify-center mb-4">
                    <Sparkles className="w-4 h-4 text-yellow-400 mr-2" />
                    <h4 className="text-sm font-medium text-blue-100">Quick Demo Access</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { key: 'responder', label: 'Field Responder', icon: '🚨', color: 'red' },
                      { key: 'command', label: 'Command Center', icon: '🎯', color: 'blue' },
                      { key: 'officer', label: 'District Officer', icon: '🏛️', color: 'green' },
                      { key: 'admin', label: 'Admin', icon: '⚙️', color: 'purple' },
                    ].map((account) => (
                      <div key={account.key} className="space-y-1">
                        {/* Fill Form Button */}
                        <motion.button
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => fillDemoAccount(account.key)}
                          disabled={isLoading}
                          className="w-full flex items-center justify-center px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-xs font-medium text-white hover:bg-white/20 transition-all duration-200 backdrop-blur-sm group"
                        >
                          <span className={`mr-2 group-hover:scale-110 transition-transform`}>
                            {account.icon}
                          </span>
                          <span className="truncate">{account.label}</span>
                        </motion.button>
                        
                        {/* Quick Login Button */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => loginDemoAccount(account.key)}
                          disabled={isLoading}
                          className="w-full px-2 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded text-xs font-medium text-green-300 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-200 backdrop-blur-sm"
                        >
                          Quick Login
                        </motion.button>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-center text-xs text-blue-300 mb-2">
                    All demo accounts use password: <code className="bg-white/10 px-2 py-1 rounded text-cyan-400">demo123</code>
                  </p>
                  
                  <div className="text-center">
                    <p className="text-xs text-blue-400 font-medium">
                      💡 Fill form first, then click "Sign In" button above
                    </p>
                    <p className="text-xs text-green-400 mt-1">
                      🚀 Or use "Quick Login" for instant access
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
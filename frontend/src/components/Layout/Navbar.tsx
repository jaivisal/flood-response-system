import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Bell, 
  User, 
  LogOut, 
  Settings, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  Search,
  AlertTriangle,
  Activity,
  Clock,
  Users,
  MapPin,
  Wifi,
  WifiOff,
  Battery,
  Smartphone,
  Globe,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Filter,
  MoreVertical,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useIncidents } from '../../hooks/useIncidents';

interface NavbarProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Navbar({ onMenuClick, sidebarCollapsed, onToggleCollapse }: NavbarProps) {
  const { user, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(100);

  const { data: incidents = [] } = useIncidents();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor fullscreen status
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Mock battery level (in real app, use Battery API)
  useEffect(() => {
    const timer = setInterval(() => {
      setBatteryLevel(prev => Math.max(20, prev - Math.random() * 2));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Generate notifications from incidents
  const notifications = [
    ...incidents.filter(i => i.severity === 'critical').slice(0, 3).map(incident => ({
      id: `incident-${incident.id}`,
      type: 'critical' as const,
      title: 'Critical Emergency',
      message: incident.title,
      time: new Date(incident.created_at),
      read: false,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
    })),
    {
      id: 'system-check',
      type: 'info' as const,
      title: 'System Health Check',
      message: 'All systems operational',
      time: new Date(Date.now() - 10 * 60 * 1000),
      read: true,
      icon: <Activity className="w-4 h-4" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      id: 'weather-update',
      type: 'warning' as const,
      title: 'Weather Alert',
      message: 'Heavy rainfall expected in 2 hours',
      time: new Date(Date.now() - 30 * 60 * 1000),
      read: false,
      icon: <Globe className="w-4 h-4" />,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
    }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'from-purple-500 to-purple-600';
      case 'command_center':
        return 'from-blue-500 to-blue-600';
      case 'district_officer':
        return 'from-green-500 to-green-600';
      case 'field_responder':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return '⚙️';
      case 'command_center':
        return '🎯';
      case 'district_officer':
        return '🏛️';
      case 'field_responder':
        return '🚨';
      default:
        return '👤';
    }
  };

  return (
    <nav className="relative z-30 bg-black/20 backdrop-blur-xl border-b border-white/10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              onClick={onMenuClick}
            >
              <Menu className="h-6 w-6" />
            </motion.button>

            {/* Desktop sidebar toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="hidden lg:flex p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              onClick={onToggleCollapse}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </motion.button>

            {/* Search bar */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <AnimatePresence>
                  {searchOpen ? (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 300, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center"
                    >
                      <input
                        type="text"
                        placeholder="Search incidents, units..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                        onBlur={() => !searchTerm && setSearchOpen(false)}
                      />
                    </motion.div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSearchOpen(true)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <Search className="h-5 w-5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Status indicators */}
            <div className="hidden lg:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-gray-300 font-medium">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
              </div>

              <div className="flex items-center space-x-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-white font-mono">
                  {currentTime.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            {/* Quick stats */}
            <div className="hidden xl:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 rounded-xl border border-red-500/30">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-300 font-medium">
                  {incidents.filter(i => i.severity === 'critical').length} Critical
                </span>
              </div>

              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300 font-medium">
                  {incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length} Active
                </span>
              </div>
            </div>

            {/* Fullscreen toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </motion.button>

            {/* Notifications */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </motion.button>

              {/* Notifications dropdown */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-96 bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50"
                  >
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Notifications</h3>
                        <span className="text-sm text-gray-400">{unreadCount} unread</span>
                      </div>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-4 hover:bg-white/5 transition-colors border-l-4 ${
                            notification.type === 'critical' ? 'border-red-500' :
                            notification.type === 'warning' ? 'border-yellow-500' :
                            'border-blue-500'
                          } ${!notification.read ? 'bg-white/5' : ''}`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-xl ${notification.bgColor}`}>
                              <div className={notification.color}>
                                {notification.icon}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-300 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {notification.time.toLocaleTimeString()}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    <div className="p-4 border-t border-white/10">
                      <button className="w-full text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className="flex items-center space-x-3 p-2 text-sm rounded-xl hover:bg-white/10 transition-colors"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`h-10 w-10 bg-gradient-to-br ${getRoleColor(user?.role || '')} rounded-xl flex items-center justify-center shadow-lg`}>
                      <span className="text-lg">{getRoleIcon(user?.role || '')}</span>
                    </div>
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-white">
                      {user?.full_name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {user?.role.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Profile dropdown menu */}
              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-72 bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50"
                  >
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className={`h-12 w-12 bg-gradient-to-br ${getRoleColor(user?.role || '')} rounded-xl flex items-center justify-center shadow-lg`}>
                          <span className="text-xl">{getRoleIcon(user?.role || '')}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{user?.full_name}</p>
                          <p className="text-sm text-gray-400">{user?.email}</p>
                          <div className="flex items-center mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getRoleColor(user?.role || '')} text-white`}>
                              <Shield className="w-3 h-3 mr-1" />
                              {user?.role.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                        <User className="mr-3 h-4 w-4" />
                        Profile Settings
                      </button>
                      
                      <button className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                        <Settings className="mr-3 h-4 w-4" />
                        Preferences
                      </button>

                      <button className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                        <Bell className="mr-3 h-4 w-4" />
                        Notification Settings
                      </button>

                      <button className="flex items-center w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                        <Smartphone className="mr-3 h-4 w-4" />
                        Mobile App
                      </button>
                    </div>
                    
                    <div className="border-t border-white/10 p-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                      </button>
                    </div>

                    {/* System info */}
                    <div className="p-4 border-t border-white/10 bg-white/5">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center space-x-2">
                          <Battery className="w-3 h-3 text-green-400" />
                          <span className="text-gray-400">Battery: {batteryLevel.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Globe className="w-3 h-3 text-blue-400" />
                          <span className="text-gray-400">Ver 2.1.0</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(profileDropdownOpen || notificationsOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setProfileDropdownOpen(false);
            setNotificationsOpen(false);
          }}
        />
      )}
    </nav>
  );
}
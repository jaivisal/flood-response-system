import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  AlertTriangle,
  Activity,
  MapPin,
  Users,
  Settings,
  Waves,
  X,
  Shield,
  TrendingUp,
  FileText,
  Radio,
  Calendar,
  BarChart3,
  MessageSquare,
  Phone,
  Globe,
  Zap,
  Heart,
  Target,
  Eye,
  Gauge,
  Database,
  Wifi,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  ThermometerSun,
  Wind,
  Droplets
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useIncidents } from '../../hooks/useIncidents';
import { useRescueUnits } from '../../hooks/useRescueUnits';
import { NavItem } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Incidents',
    href: '/incidents',
    icon: AlertTriangle,
  },
  {
    name: 'Rescue Units',
    href: '/rescue-units',
    icon: Activity,
    roles: ['command_center', 'admin'],
  },
  {
    name: 'Flood Zones',
    href: '/flood-zones',
    icon: MapPin,
    roles: ['district_officer', 'admin'],
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
    roles: ['command_center', 'district_officer', 'admin'],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    roles: ['command_center', 'district_officer', 'admin'],
  },
  {
    name: 'Communications',
    href: '/communications',
    icon: Radio,
    roles: ['command_center', 'admin'],
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemHealth, setSystemHealth] = useState({
    cpu: 85,
    memory: 72,
    disk: 45,
    network: 98
  });

  const { data: incidents = [] } = useIncidents();
  const { data: rescueUnits = [] } = useRescueUnits();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate system health updates
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemHealth(prev => ({
        cpu: Math.max(20, Math.min(100, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(20, Math.min(100, prev.memory + (Math.random() - 0.5) * 8)),
        disk: Math.max(10, Math.min(100, prev.disk + (Math.random() - 0.5) * 3)),
        network: Math.max(70, Math.min(100, prev.network + (Math.random() - 0.5) * 5))
      }));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const canAccessRoute = (item: NavItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    return user && item.roles.includes(user.role);
  };

  const filteredNavigation = navigation.filter(canAccessRoute);

  // Calculate stats
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
  const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length;
  const availableUnits = rescueUnits.filter(u => u.status === 'available').length;
  const responseUnits = rescueUnits.filter(u => ['en_route', 'on_scene'].includes(u.status)).length;

  const sidebarVariants = {
    closed: {
      x: '-100%',
      transition: { type: 'tween', duration: 0.3 },
    },
    open: {
      x: 0,
      transition: { type: 'tween', duration: 0.3 },
    },
  };

  const getHealthColor = (value: number) => {
    if (value >= 80) return 'text-green-400';
    if (value >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBg = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-shrink-0 lg:fixed lg:inset-y-0 lg:z-50 transition-all duration-300 ${
        isCollapsed ? 'lg:w-20' : 'lg:w-80'
      }`}>
        <div className="flex flex-col w-full">
          <div className="flex flex-col flex-grow bg-slate-900/90 backdrop-blur-xl border-r border-white/10 pt-5 pb-4 overflow-y-auto">
            {/* Logo */}
            <div className={`flex items-center flex-shrink-0 px-4 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="flex items-center">
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg"
                >
                  <Waves className="w-7 h-7 text-white" />
                </motion.div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="ml-3"
                    >
                      <h1 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                        FloodResponse
                      </h1>
                      <p className="text-xs text-blue-300">Emergency System</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* User info */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-6 px-4"
                >
                  <div className="flex items-center p-4 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Shield className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user?.full_name}
                      </p>
                      <div className="flex items-center mt-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                        <p className="text-xs text-gray-300">
                          {user?.role.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <nav className={`mt-6 flex-1 px-4 space-y-2 ${isCollapsed ? 'px-2' : ''}`}>
              {filteredNavigation.map((item, index) => {
                const isActive = location.pathname === item.href;
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        `group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        } ${isCollapsed ? 'justify-center' : ''}`
                      }
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon
                        className={`flex-shrink-0 h-6 w-6 ${
                          isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                        }`}
                      />
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="ml-3"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {!isCollapsed && item.name === 'Incidents' && criticalIncidents > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-auto inline-block py-1 px-2 text-xs font-medium rounded-full bg-red-500 text-white animate-pulse"
                        >
                          {criticalIncidents}
                        </motion.span>
                      )}
                    </NavLink>
                  </motion.div>
                );
              })}
            </nav>

            {/* Quick stats */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mt-auto px-4 pb-4"
                >
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <h3 className="text-sm font-medium text-white mb-3 flex items-center">
                      <Gauge className="w-4 h-4 mr-2 text-green-400" />
                      System Status
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Cpu className="w-3 h-3 mr-1 text-blue-400" />
                            <span className="text-gray-300">CPU</span>
                          </div>
                          <span className={`font-medium ${getHealthColor(systemHealth.cpu)}`}>
                            {systemHealth.cpu.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all ${getHealthBg(systemHealth.cpu)}`}
                            style={{ width: `${systemHealth.cpu}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <MemoryStick className="w-3 h-3 mr-1 text-purple-400" />
                            <span className="text-gray-300">RAM</span>
                          </div>
                          <span className={`font-medium ${getHealthColor(100 - systemHealth.memory)}`}>
                            {systemHealth.memory.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all ${getHealthBg(100 - systemHealth.memory)}`}
                            style={{ width: `${systemHealth.memory}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <HardDrive className="w-3 h-3 mr-1 text-orange-400" />
                            <span className="text-gray-300">Disk</span>
                          </div>
                          <span className={`font-medium ${getHealthColor(100 - systemHealth.disk)}`}>
                            {systemHealth.disk.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all ${getHealthBg(100 - systemHealth.disk)}`}
                            style={{ width: `${systemHealth.disk}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Wifi className="w-3 h-3 mr-1 text-green-400" />
                            <span className="text-gray-300">Net</span>
                          </div>
                          <span className={`font-medium ${getHealthColor(systemHealth.network)}`}>
                            {systemHealth.network.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all ${getHealthBg(systemHealth.network)}`}
                            style={{ width: `${systemHealth.network}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-red-400">{activeIncidents}</div>
                          <div className="text-xs text-gray-400">Active</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-400">{availableUnits}</div>
                          <div className="text-xs text-gray-400">Units</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-center">
                      <div className="text-xs text-gray-500">
                        {currentTime.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsed quick info */}
            <AnimatePresence>
              {isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-2 pb-4 space-y-2"
                >
                  <div className="flex flex-col items-center p-2 bg-red-500/20 rounded-xl border border-red-500/30">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-xs font-bold text-red-300">{criticalIncidents}</span>
                  </div>
                  
                  <div className="flex flex-col items-center p-2 bg-green-500/20 rounded-xl border border-green-500/30">
                    <Shield className="w-5 h-5 text-green-400" />
                    <span className="text-xs font-bold text-green-300">{availableUnits}</span>
                  </div>

                  <div className="flex flex-col items-center p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <span className="text-xs font-bold text-blue-300">{responseUnits}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariants}
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-80 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 overflow-y-auto"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between flex-shrink-0 px-4 py-4 border-b border-white/10">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                    <Waves className="w-7 h-7 text-white" />
                  </div>
                  <div className="ml-3">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                      FloodResponse
                    </h1>
                    <p className="text-xs text-blue-300">Emergency System</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  onClick={onClose}
                >
                  <X className="h-6 w-6" />
                </motion.button>
              </div>

              {/* User info */}
              <div className="px-4 py-4 border-b border-white/10">
                <div className="flex items-center p-4 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl border border-white/20">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.full_name}
                    </p>
                    <p className="text-xs text-gray-300 truncate">
                      {user?.email}
                    </p>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                      <p className="text-xs text-blue-400 font-medium">
                        {user?.role.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-4 space-y-2">
                {filteredNavigation.map((item, index) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <NavLink
                        to={item.href}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                              : 'text-gray-300 hover:bg-white/10 hover:text-white'
                          }`
                        }
                      >
                        <item.icon
                          className={`mr-4 flex-shrink-0 h-6 w-6 ${
                            isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                          }`}
                        />
                        {item.name}
                        {item.name === 'Incidents' && criticalIncidents > 0 && (
                          <span className="ml-auto inline-block py-1 px-2 text-xs font-medium rounded-full bg-red-500 text-white animate-pulse">
                            {criticalIncidents}
                          </span>
                        )}
                      </NavLink>
                    </motion.div>
                  );
                })}
              </nav>

              {/* Mobile quick stats */}
              <div className="px-4 pb-4">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <h3 className="text-sm font-medium text-white mb-3 flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2 text-blue-400" />
                    Live Status
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                      <div className="text-xl font-bold text-red-400">{criticalIncidents}</div>
                      <div className="text-xs text-red-300">Critical</div>
                    </div>
                    <div className="text-center p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                      <div className="text-xl font-bold text-blue-400">{activeIncidents}</div>
                      <div className="text-xs text-blue-300">Active</div>
                    </div>
                    <div className="text-center p-3 bg-green-500/20 rounded-xl border border-green-500/30">
                      <div className="text-xl font-bold text-green-400">{availableUnits}</div>
                      <div className="text-xs text-green-300">Available</div>
                    </div>
                    <div className="text-center p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
                      <div className="text-xl font-bold text-purple-400">{responseUnits}</div>
                      <div className="text-xs text-purple-300">Responding</div>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-center">
                    <div className="text-xs text-gray-500">
                      {currentTime.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
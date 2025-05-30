import React from 'react';
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
  FileText
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NavItem } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation: NavItem[] = [
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

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  const canAccessRoute = (item: NavItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    return user && item.roles.includes(user.role);
  };

  const filteredNavigation = navigation.filter(canAccessRoute);

  const sidebarVariants = {
    closed: {
      x: '-100%',
      transition: {
        type: 'tween',
        duration: 0.3,
      },
    },
    open: {
      x: 0,
      transition: {
        type: 'tween',
        duration: 0.3,
      },
    },
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                  <Waves className="w-6 h-6 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900">FloodResponse</h1>
                  <p className="text-xs text-gray-500">Emergency System</p>
                </div>
              </div>
            </div>

            {/* User info */}
            <div className="mt-6 px-4">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="mt-6 flex-1 px-4 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                        isActive
                          ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-5 w-5 ${
                        isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.name}
                    {item.name === 'Incidents' && (
                      <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        3
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Quick stats */}
            <div className="mt-auto px-4 pb-4">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-4 text-white">
                <h3 className="text-sm font-medium">System Status</h3>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Active Incidents</span>
                    <span className="font-medium">12</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Available Units</span>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Response Time</span>
                    <span className="font-medium">12.5m</span>
                  </div>
                </div>
              </div>
            </div>
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
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 overflow-y-auto"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between flex-shrink-0 px-4 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                    <Waves className="w-6 h-6 text-white" />
                  </div>
                  <div className="ml-3">
                    <h1 className="text-lg font-bold text-gray-900">FloodResponse</h1>
                    <p className="text-xs text-gray-500">Emergency System</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  onClick={onClose}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>

              {/* User info */}
              <div className="px-4 py-4 border-b border-gray-200">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-blue-600 font-medium">
                      {user?.role.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-4 space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors duration-200 ${
                          isActive
                            ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`
                      }
                    >
                      <item.icon
                        className={`mr-4 flex-shrink-0 h-6 w-6 ${
                          isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                      {item.name === 'Incidents' && (
                        <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          3
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>

              {/* Mobile quick stats */}
              <div className="px-4 pb-4">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-4 text-white">
                  <h3 className="text-sm font-medium">System Status</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-bold">12</div>
                      <div className="text-xs opacity-75">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">8</div>
                      <div className="text-xs opacity-75">Units</div>
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
}Dashboard',
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
    name: '
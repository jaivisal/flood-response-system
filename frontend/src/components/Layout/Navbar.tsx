import React, { useState } from 'react';
import { Menu, Bell, User, LogOut, Settings, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const notifications = [
    {
      id: 1,
      type: 'critical',
      title: 'Critical Incident Reported',
      message: 'Severe flooding in Zone A-12',
      time: '2 min ago',
      read: false,
    },
    {
      id: 2,
      type: 'info',
      title: 'Unit Status Update',
      message: 'Rescue Unit Alpha-1 is en route',
      time: '15 min ago',
      read: true,
    },
    {
      id: 3,
      type: 'warning',
      title: 'Weather Alert',
      message: 'Heavy rainfall predicted',
      time: '1 hour ago',
      read: true,
    },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'command_center':
        return 'bg-blue-100 text-blue-800';
      case 'district_officer':
        return 'bg-green-100 text-green-800';
      case 'field_responder':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Current time and status */}
            <div className="hidden sm:flex items-center ml-4">
              <div className="flex items-center text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span>System Online • {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5"
                  >
                    <div className="px-4 py-2 border-b border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-4 ${
                            notification.type === 'critical'
                              ? 'border-red-500'
                              : notification.type === 'warning'
                              ? 'border-yellow-500'
                              : 'border-blue-500'
                          } ${!notification.read ? 'bg-blue-50' : ''}`}
                        >
                          <div className="flex items-start">
                            <span className="text-lg mr-3">{getNotificationIcon(notification.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-200">
                      <button className="text-sm text-blue-600 hover:text-blue-500">
                        View all notifications
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center p-2 text-sm rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <span className="sr-only">Open user menu</span>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.full_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user?.role || '')}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user?.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Profile dropdown menu */}
              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5"
                  >
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm text-gray-900 font-medium">{user?.full_name}</p>
                      <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {user?.department}
                      </p>
                    </div>
                    
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <User className="mr-3 h-4 w-4" />
                      Profile Settings
                    </button>
                    
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <Settings className="mr-3 h-4 w-4" />
                      Preferences
                    </button>
                    
                    <div className="border-t border-gray-200"></div>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign out
                    </button>
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
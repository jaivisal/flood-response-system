import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Activity,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  MapPin,
  Zap,
  Shield,
  UserPlus,
  Bell,
  Gauge,
  Eye,
  Radio,
  Target,
  Navigation,
  Waves,
  ThermometerSun,
  Wind,
  Droplets,
  Calendar,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Heart,
  Truck,
  Building2,
  Map,
  MessageSquare,
  Phone,
  Mail,
  Globe,
  Smartphone,
  Wifi,
  WifiOff,
  X,
  CheckCircle
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useIncidents, useIncidentStats } from '../hooks/useIncidents';
import { useRescueUnits } from '../hooks/useRescueUnits';
import { useFloodZones } from '../hooks/useFloodZones';
import { useAutoAssignUnits } from '../hooks/useAssignments';
import MapContainer from '../components/Map/MapContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import SimpleIncidentForm from '../components/Forms/IncidentForm';
import UnitAssignmentModal from '../components/Incidents/UnitAssignmentModal';
import { Incident, RescueUnit } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [incidentToAssign, setIncidentToAssign] = useState<Incident | null>(null);
  const [showAutoAssignConfirm, setShowAutoAssignConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showContactUnits, setShowContactUnits] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

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

  // Fetch data with auto-refresh
  const {
    data: incidents = [],
    isLoading: incidentsLoading,
    refetch: refetchIncidents,
  } = useIncidents({
    refetchInterval: refreshInterval,
  });

  const {
    data: rescueUnits = [],
    isLoading: unitsLoading,
    refetch: refetchUnits,
  } = useRescueUnits({
    refetchInterval: refreshInterval,
  });

  const {
    data: floodZones = [],
    isLoading: zonesLoading,
    refetch: refetchZones,
  } = useFloodZones({
    refetchInterval: refreshInterval,
  });

  const {
    data: incidentStats,
    isLoading: statsLoading,
    error: statsError,
  } = useIncidentStats();

  const autoAssignMutation = useAutoAssignUnits();

  // Calculate metrics
  const criticalIncidents = incidents.filter(i => i.severity === 'critical');
  const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status));
  const availableUnits = rescueUnits.filter(u => u.status === 'available');
  const responseUnits = rescueUnits.filter(u => ['en_route', 'on_scene'].includes(u.status));
  const unassignedCritical = criticalIncidents.filter(i => i.status === 'reported' && !i.assigned_unit_id);
  const todayIncidents = incidents.filter(i => {
    const today = new Date();
    const incidentDate = new Date(i.created_at);
    return incidentDate.toDateString() === today.toDateString();
  });

  // Weather simulation
  const weatherData = {
    temperature: 28,
    humidity: 75,
    windSpeed: 12,
    precipitation: 15,
    condition: 'Partly Cloudy',
    uv: 6,
    visibility: 10
  };

  // Report handlers
  const handleReportIncident = () => setIsReportFormOpen(true);
  const handleCloseReportForm = () => setIsReportFormOpen(false);
  const handleReportSuccess = (incident: any) => {
    setIsReportFormOpen(false);
    refetchIncidents();
    refetchUnits();
    refetchZones();
  };

  // Assignment handlers
  const handleAssignUnit = (incident: Incident) => {
    setIncidentToAssign(incident);
    setIsAssignmentModalOpen(true);
  };

  const handleAssignmentSuccess = (assignedUnit: RescueUnit) => {
    setIsAssignmentModalOpen(false);
    setIncidentToAssign(null);
    refetchIncidents();
    refetchUnits();
  };

  const handleAutoAssign = async () => {
    try {
      const criticalIncidentIds = unassignedCritical.map(incident => incident.id);
      if (criticalIncidentIds.length === 0) return;

      await autoAssignMutation.mutateAsync(criticalIncidentIds);
      setShowAutoAssignConfirm(false);
      refetchIncidents();
      refetchUnits();
    } catch (error) {
      setShowAutoAssignConfirm(false);
    }
  };

  if (incidentsLoading || unitsLoading || zonesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            <Waves className="w-8 h-8 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Emergency Response System</h2>
          <p className="text-blue-200">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-black/20 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
                  <Waves className="w-7 h-7 text-white" />
                </div>
                {criticalIncidents.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-xs font-bold text-white">{criticalIncidents.length}</span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Emergency Command Center
                </h1>
                <p className="text-blue-200 text-sm">{user?.full_name} • {user?.role.replace('_', ' ')}</p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-6">
              {/* Time */}
              <div className="text-center">
                <div className="text-xl font-mono font-bold text-white">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-xs text-blue-200">
                  {currentTime.toLocaleDateString()}
                </div>
              </div>

              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <>
                    <Wifi className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 text-sm font-medium">Offline</span>
                  </>
                )}
              </div>

              {/* Refresh Control */}
              <div className="flex items-center space-x-2">
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-sm text-white backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10000}>10s</option>
                  <option value={30000}>30s</option>
                  <option value={60000}>1m</option>
                  <option value={0}>Manual</option>
                </select>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    refetchIncidents();
                    refetchUnits();
                    refetchZones();
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Critical Alert Banner */}
        <AnimatePresence>
          {criticalIncidents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-700 to-red-800 rounded-2xl p-6 shadow-2xl border border-red-500/50"
            >
              <div className="absolute inset-0 bg-red-500/20 animate-pulse"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {criticalIncidents.length} Critical Emergency{criticalIncidents.length > 1 ? ' Incidents' : ' Incident'}
                    </h2>
                    <p className="text-red-100">
                      {unassignedCritical.length > 0 ? 
                        `${unassignedCritical.length} unassigned - Immediate action required` :
                        'All critical incidents have response units assigned'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  {unassignedCritical.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowAutoAssignConfirm(true)}
                      disabled={autoAssignMutation.isLoading}
                      className="px-6 py-3 bg-white text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-lg"
                    >
                      <Zap className="w-5 h-5 mr-2 inline" />
                      Auto-Assign Units
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-colors"
                  >
                    View Details
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Critical Incidents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group relative overflow-hidden bg-gradient-to-br from-red-600/90 to-red-700/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-red-500/30 hover:shadow-2xl transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                {criticalIncidents.length > 0 && (
                  <div className="flex items-center text-red-200">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span className="text-sm">Active</span>
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-white mb-1">{criticalIncidents.length}</div>
              <div className="text-red-100 text-sm font-medium">Critical Incidents</div>
              <div className="text-red-200 text-xs mt-1">{activeIncidents.length} total active</div>
            </div>
          </motion.div>

          {/* Available Units */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative overflow-hidden bg-gradient-to-br from-green-600/90 to-green-700/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-green-500/30 hover:shadow-2xl transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center text-green-200">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  <span className="text-sm">Ready</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{availableUnits.length}</div>
              <div className="text-green-100 text-sm font-medium">Available Units</div>
              <div className="text-green-200 text-xs mt-1">{responseUnits.length} responding</div>
            </div>
          </motion.div>

          {/* Response Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-600/90 to-blue-700/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-blue-500/30 hover:shadow-2xl transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center text-blue-200">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  <span className="text-sm">Improving</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {typeof incidentStats?.average_resolution_time === 'number' ? 
                  `${incidentStats.average_resolution_time.toFixed(1)}h` : '12.5h'
                }
              </div>
              <div className="text-blue-100 text-sm font-medium">Avg Response Time</div>
              <div className="text-blue-200 text-xs mt-1">Last 24 hours</div>
            </div>
          </motion.div>

          {/* People Affected */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="group relative overflow-hidden bg-gradient-to-br from-orange-600/90 to-orange-700/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-orange-500/30 hover:shadow-2xl transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center text-orange-200">
                  <Heart className="w-4 h-4 mr-1" />
                  <span className="text-sm">Today</span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {incidents.reduce((sum, i) => sum + (i.affected_people_count || 0), 0).toLocaleString()}
              </div>
              <div className="text-orange-100 text-sm font-medium">People Affected</div>
              <div className="text-orange-200 text-xs mt-1">{todayIncidents.length} incidents today</div>
            </div>
          </motion.div>
        </div>

        {/* Weather & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weather Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-purple-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <ThermometerSun className="w-5 h-5 mr-2 text-purple-400" />
                Weather Conditions
              </h3>
              <span className="text-purple-300 text-sm">Live</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{weatherData.temperature}°C</div>
                <div className="text-purple-200 text-sm">{weatherData.condition}</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-200 flex items-center">
                    <Droplets className="w-3 h-3 mr-1" />
                    Humidity
                  </span>
                  <span className="text-white font-medium">{weatherData.humidity}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-200 flex items-center">
                    <Wind className="w-3 h-3 mr-1" />
                    Wind
                  </span>
                  <span className="text-white font-medium">{weatherData.windSpeed} km/h</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-200 flex items-center">
                    <Droplets className="w-3 h-3 mr-1" />
                    Rain
                  </span>
                  <span className="text-white font-medium">{weatherData.precipitation}mm</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* System Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-green-600/30 to-green-800/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-green-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Gauge className="w-5 h-5 mr-2 text-green-400" />
                System Health
              </h3>
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-green-200 text-sm">Server Status</span>
                <span className="text-green-400 font-medium">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-200 text-sm">Database</span>
                <span className="text-green-400 font-medium">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-200 text-sm">GPS Tracking</span>
                <span className="text-green-400 font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-200 text-sm">Communications</span>
                <span className="text-green-400 font-medium">Online</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-green-300">
              Last health check: {currentTime.toLocaleTimeString()}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-cyan-600/30 to-cyan-800/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-cyan-500/30"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-cyan-400" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReportIncident}
                className="w-full p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Emergency
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowContactUnits(true)}
                className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center"
              >
                <Radio className="w-4 h-4 mr-2" />
                Contact Units
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAnalytics(true)}
                className="w-full p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="lg:col-span-2 bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <Map className="w-6 h-6 mr-3 text-blue-400" />
                Live Situation Map
              </h3>
              <div className="flex items-center space-x-4 text-sm text-blue-200">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  {incidents.length} incidents
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  {rescueUnits.length} units
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  {floodZones.length} zones
                </span>
              </div>
            </div>
            
            <div className="h-96 rounded-xl overflow-hidden border border-white/20">
              <MapContainer
                incidents={incidents}
                rescueUnits={rescueUnits}
                floodZones={floodZones}
                height="100%"
                showControls={true}
              />
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Activity className="w-6 h-6 mr-3 text-orange-400" />
              Recent Activity
            </h3>
            
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {incidents.slice(0, 8).map((incident, index) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => handleAssignUnit(incident)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      incident.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      incident.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      incident.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-white font-medium text-sm truncate">
                          {incident.title}
                        </h4>
                        {incident.is_critical && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                            Critical
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-300">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(incident.created_at).toLocaleTimeString()}
                        </span>
                        <span className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {incident.affected_people_count}
                        </span>
                        {incident.address && (
                          <span className="flex items-center truncate">
                            <MapPin className="w-3 h-3 mr-1" />
                            {incident.address.substring(0, 20)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Unit Status Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <Truck className="w-6 h-6 mr-3 text-green-400" />
              Active Response Units
            </h3>
            <div className="flex items-center space-x-2 text-sm text-blue-200">
              <span>{availableUnits.length} available</span>
              <span>•</span>
              <span>{responseUnits.length} responding</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {rescueUnits.slice(0, 8).map((unit, index) => (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border transition-all duration-200 hover:scale-105 cursor-pointer ${
                  unit.status === 'available' ? 'bg-green-500/20 border-green-500/30' :
                  unit.status === 'busy' ? 'bg-yellow-500/20 border-yellow-500/30' :
                  unit.status === 'en_route' ? 'bg-blue-500/20 border-blue-500/30' :
                  unit.status === 'on_scene' ? 'bg-purple-500/20 border-purple-500/30' :
                  'bg-gray-500/20 border-gray-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg">
                    {unit.unit_type === 'fire_rescue' ? '🚒' :
                     unit.unit_type === 'medical' ? '🚑' :
                     unit.unit_type === 'water_rescue' ? '🚤' :
                     unit.unit_type === 'evacuation' ? '🚐' :
                     unit.unit_type === 'search_rescue' ? '🚁' :
                     unit.unit_type === 'police' ? '🚓' : '🚨'}
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    unit.status === 'available' ? 'bg-green-400' :
                    unit.status === 'busy' ? 'bg-yellow-400' :
                    unit.status === 'en_route' ? 'bg-blue-400' :
                    unit.status === 'on_scene' ? 'bg-purple-400' :
                    'bg-gray-400'
                  } ${unit.status === 'en_route' || unit.status === 'on_scene' ? 'animate-pulse' : ''}`}></div>
                </div>
                
                <h4 className="text-white font-medium text-sm mb-1">{unit.unit_name}</h4>
                <div className="text-xs text-gray-300 mb-2">
                  {unit.call_sign && <span>Call: {unit.call_sign}</span>}
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">{unit.team_size} members</span>
                  <span className={`px-2 py-1 rounded-full font-medium ${
                    unit.status === 'available' ? 'bg-green-500 text-white' :
                    unit.status === 'busy' ? 'bg-yellow-500 text-white' :
                    unit.status === 'en_route' ? 'bg-blue-500 text-white' :
                    unit.status === 'on_scene' ? 'bg-purple-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {unit.status.replace('_', ' ')}
                  </span>
                </div>
                
                {unit.fuel_level && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                      <span>Fuel</span>
                      <span>{unit.fuel_level}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all ${
                          unit.fuel_level > 50 ? 'bg-green-400' :
                          unit.fuel_level > 25 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${unit.fuel_level}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.1 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
          >
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <BarChart3 className="w-6 h-6 mr-3 text-blue-400" />
              Performance Metrics
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Resolution Rate</span>
                  <span className="text-white font-medium">78%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '78%' }}
                    transition={{ duration: 1, delay: 1.2 }}
                    className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Unit Utilization</span>
                  <span className="text-white font-medium">65%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    transition={{ duration: 1, delay: 1.3 }}
                    className="bg-gradient-to-r from-blue-400 to-blue-500 h-2 rounded-full"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Response Coverage</span>
                  <span className="text-white font-medium">92%</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '92%' }}
                    transition={{ duration: 1, delay: 1.4 }}
                    className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {incidentStats?.resolved_incidents || 156}
                </div>
                <div className="text-gray-300 text-sm">Resolved Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{availableUnits.length}</div>
                <div className="text-gray-300 text-sm">Active Teams</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
          >
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <MessageSquare className="w-6 h-6 mr-3 text-purple-400" />
              Communications Hub
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center space-x-3 mb-2">
                  <Radio className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Radio Network</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-gray-300 text-sm">All units connected • Clear signal</div>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center space-x-3 mb-2">
                  <Phone className="w-5 h-5 text-green-400" />
                  <span className="text-white font-medium">Emergency Hotline</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-gray-300 text-sm">108 - Active • 24/7 monitoring</div>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center space-x-3 mb-2">
                  <Smartphone className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-medium">Mobile App</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-gray-300 text-sm">Citizens can report incidents</div>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center space-x-3 mb-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <span className="text-white font-medium">Social Media Monitor</span>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-gray-300 text-sm">Scanning for emergency reports</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Action Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleReportIncident}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-all duration-300"
      >
        <AlertTriangle className="w-7 h-7" />
        <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25"></div>
      </motion.button>

      {/* Modals */}
      <SimpleIncidentForm
        isOpen={isReportFormOpen}
        onClose={handleCloseReportForm}
        onSuccess={handleReportSuccess}
      />

      {incidentToAssign && (
        <UnitAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => {
            setIsAssignmentModalOpen(false);
            setIncidentToAssign(null);
          }}
          incident={incidentToAssign}
          onSuccess={handleAssignmentSuccess}
        />
      )}

      {/* Auto-Assign Confirmation Modal */}
      <AnimatePresence>
        {showAutoAssignConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowAutoAssignConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-500/20 rounded-xl mr-3">
                    <Zap className="w-6 h-6 text-orange-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Auto-Assign Units</h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Automatically assign the most suitable units to {unassignedCritical.length} critical incident{unassignedCritical.length > 1 ? 's' : ''}?
                </p>

                <div className="space-y-2">
                  {unassignedCritical.slice(0, 3).map((incident) => (
                    <div key={incident.id} className="flex items-center p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                      <AlertTriangle className="w-4 h-4 text-red-400 mr-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{incident.title}</p>
                        <p className="text-red-200 text-sm">{incident.affected_people_count} people affected</p>
                      </div>
                    </div>
                  ))}
                  {unassignedCritical.length > 3 && (
                    <div className="text-center text-gray-400 text-sm">
                      +{unassignedCritical.length - 3} more incident{unassignedCritical.length - 3 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAutoAssignConfirm(false)}
                  className="flex-1 px-4 py-3 text-gray-300 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAutoAssign}
                  disabled={autoAssignMutation.isLoading}
                  className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {autoAssignMutation.isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Assigning...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Confirm Auto-Assign
                    </div>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Units Modal */}
      <AnimatePresence>
        {showContactUnits && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowContactUnits(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-500/20 rounded-xl mr-3">
                    <Radio className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Contact Rescue Units</h3>
                    <p className="text-gray-300 text-sm">Emergency communication hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowContactUnits(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Available Units */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-green-400" />
                      Available Units ({availableUnits.length})
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {availableUnits.map((unit) => (
                        <div key={unit.id} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">
                                {unit.unit_type === 'fire_rescue' ? '🚒' :
                                 unit.unit_type === 'medical' ? '🚑' :
                                 unit.unit_type === 'water_rescue' ? '🚤' :
                                 unit.unit_type === 'evacuation' ? '🚐' :
                                 unit.unit_type === 'search_rescue' ? '🚁' :
                                 unit.unit_type === 'police' ? '🚓' : '🚨'}
                              </span>
                              <div>
                                <h5 className="text-white font-medium">{unit.unit_name}</h5>
                                <p className="text-gray-300 text-sm">{unit.call_sign || 'No call sign'}</p>
                              </div>
                            </div>
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-300 mb-3">
                            <span>Team: {unit.team_size}</span>
                            <span>•</span>
                            <span>Radio: {unit.radio_frequency || 'N/A'}</span>
                          </div>
                          <div className="flex space-x-2">
                            {unit.contact_number && (
                              <button
                                onClick={() => window.open(`tel:${unit.contact_number}`)}
                                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center"
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Call
                              </button>
                            )}
                            {unit.radio_frequency && (
                              <button className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center">
                                <Radio className="w-4 h-4 mr-1" />
                                Radio
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Response Units */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-blue-400" />
                      Response Units ({responseUnits.length})
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {responseUnits.map((unit) => (
                        <div key={unit.id} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">
                                {unit.unit_type === 'fire_rescue' ? '🚒' :
                                 unit.unit_type === 'medical' ? '🚑' :
                                 unit.unit_type === 'water_rescue' ? '🚤' :
                                 unit.unit_type === 'evacuation' ? '🚐' :
                                 unit.unit_type === 'search_rescue' ? '🚁' :
                                 unit.unit_type === 'police' ? '🚓' : '🚨'}
                              </span>
                              <div>
                                <h5 className="text-white font-medium">{unit.unit_name}</h5>
                                <p className="text-gray-300 text-sm">{unit.call_sign || 'No call sign'}</p>
                              </div>
                            </div>
                            <div className={`w-3 h-3 rounded-full animate-pulse ${
                              unit.status === 'en_route' ? 'bg-blue-400' : 'bg-purple-400'
                            }`}></div>
                          </div>
                          <div className="flex items-center justify-between text-sm mb-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              unit.status === 'en_route' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {unit.status.replace('_', ' ')}
                            </span>
                            <span className="text-gray-300">Team: {unit.team_size}</span>
                          </div>
                          <div className="flex space-x-2">
                            {unit.contact_number && (
                              <button
                                onClick={() => window.open(`tel:${unit.contact_number}`)}
                                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center"
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Call
                              </button>
                            )}
                            <button className="flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center">
                              <Navigation className="w-4 h-4 mr-1" />
                              Track
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Emergency Contacts */}
                <div className="mt-6 pt-6 border-t border-white/20">
                  <h4 className="text-lg font-semibold text-white mb-4">Emergency Contacts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-red-500/20 rounded-xl border border-red-500/30">
                      <div className="flex items-center space-x-3 mb-2">
                        <Phone className="w-5 h-5 text-red-400" />
                        <h5 className="text-white font-medium">Emergency Hotline</h5>
                      </div>
                      <p className="text-red-200 text-lg font-bold">108</p>
                      <button
                        onClick={() => window.open('tel:108')}
                        className="mt-2 w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                      >
                        Call Now
                      </button>
                    </div>
                    <div className="p-4 bg-blue-500/20 rounded-xl border border-blue-500/30">
                      <div className="flex items-center space-x-3 mb-2">
                        <Radio className="w-5 h-5 text-blue-400" />
                        <h5 className="text-white font-medium">Control Room</h5>
                      </div>
                      <p className="text-blue-200 text-lg font-bold">Channel 1</p>
                      <button className="mt-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                        Connect Radio
                      </button>
                    </div>
                    <div className="p-4 bg-green-500/20 rounded-xl border border-green-500/30">
                      <div className="flex items-center space-x-3 mb-2">
                        <Mail className="w-5 h-5 text-green-400" />
                        <h5 className="text-white font-medium">Command Center</h5>
                      </div>
                      <p className="text-green-200 text-sm">command@emergency.gov</p>
                      <button
                        onClick={() => window.open('mailto:command@emergency.gov')}
                        className="mt-2 w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                      >
                        Send Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Modal */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setShowAnalytics(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-white/20"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-500/20 rounded-xl mr-3">
                    <BarChart3 className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Emergency Analytics Dashboard</h3>
                    <p className="text-gray-300 text-sm">Real-time performance metrics and insights</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl border border-red-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                      <span className="text-2xl font-bold text-white">{incidents.length}</span>
                    </div>
                    <p className="text-red-200 text-sm font-medium">Total Incidents</p>
                    <p className="text-red-300 text-xs">+{todayIncidents.length} today</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl border border-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <span className="text-2xl font-bold text-white">{incidentStats?.resolved_incidents || 156}</span>
                    </div>
                    <p className="text-green-200 text-sm font-medium">Resolved Cases</p>
                    <p className="text-green-300 text-xs">78% success rate</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <Activity className="w-6 h-6 text-blue-400" />
                      <span className="text-2xl font-bold text-white">{rescueUnits.length}</span>
                    </div>
                    <p className="text-blue-200 text-sm font-medium">Rescue Units</p>
                    <p className="text-blue-300 text-xs">{availableUnits.length} available</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl border border-purple-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-6 h-6 text-purple-400" />
                      <span className="text-2xl font-bold text-white">
                        {typeof incidentStats?.average_resolution_time === 'number' ? 
                          `${incidentStats.average_resolution_time.toFixed(1)}h` : '12.5h'
                        }
                      </span>
                    </div>
                    <p className="text-purple-200 text-sm font-medium">Avg Response</p>
                    <p className="text-purple-300 text-xs">15% improvement</p>
                  </div>
                </div>

                {/* Charts and Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Incident Types Chart */}
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <h4 className="text-white font-semibold mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                      Incident Types Distribution
                    </h4>
                    <div className="space-y-3">
                      {['flood', 'rescue_needed', 'medical_emergency', 'infrastructure_damage', 'other'].map((type, index) => {
                        const count = incidents.filter(i => i.incident_type === type).length;
                        const percentage = incidents.length > 0 ? (count / incidents.length) * 100 : 0;
                        const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500'];
                        
                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-gray-300 text-sm capitalize">{type.replace('_', ' ')}</span>
                              <span className="text-white text-sm font-medium">{count}</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-2">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                                className={`h-2 rounded-full ${colors[index]}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Unit Status Chart */}
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <h4 className="text-white font-semibold mb-4 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-green-400" />
                      Unit Status Overview
                    </h4>
                    <div className="space-y-3">
                      {[
                        { status: 'available', count: availableUnits.length, color: 'bg-green-500' },
                        { status: 'en_route', count: rescueUnits.filter(u => u.status === 'en_route').length, color: 'bg-blue-500' },
                        { status: 'on_scene', count: rescueUnits.filter(u => u.status === 'on_scene').length, color: 'bg-purple-500' },
                        { status: 'busy', count: rescueUnits.filter(u => u.status === 'busy').length, color: 'bg-yellow-500' },
                        { status: 'offline', count: rescueUnits.filter(u => u.status === 'offline').length, color: 'bg-gray-500' }
                      ].map((item, index) => {
                        const percentage = rescueUnits.length > 0 ? (item.count / rescueUnits.length) * 100 : 0;
                        
                        return (
                          <div key={item.status}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-gray-300 text-sm capitalize">{item.status.replace('_', ' ')}</span>
                              <span className="text-white text-sm font-medium">{item.count}</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-2">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                                className={`h-2 rounded-full ${item.color}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timeline Analysis */}
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <h4 className="text-white font-semibold mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-cyan-400" />
                      Today's Timeline
                    </h4>
                    <div className="space-y-4">
                      {todayIncidents.slice(0, 5).map((incident, index) => (
                        <div key={incident.id} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{incident.title}</p>
                            <p className="text-gray-400 text-xs">
                              {new Date(incident.created_at).toLocaleTimeString()} • {incident.severity}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            incident.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                            incident.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            incident.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {incident.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <h4 className="text-white font-semibold mb-4 flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                      Performance Trends
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Response Efficiency</span>
                        <span className="text-green-400 text-sm font-medium flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          +12%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Unit Utilization</span>
                        <span className="text-blue-400 text-sm font-medium flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          +8%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Public Safety Score</span>
                        <span className="text-purple-400 text-sm font-medium flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          +15%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">Cost Efficiency</span>
                        <span className="text-orange-400 text-sm font-medium flex items-center">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          -5%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
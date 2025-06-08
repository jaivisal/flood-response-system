import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Clock,
  Users,
  MapPin,
  AlertTriangle,
  Shield,
  Zap,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Target,
  Gauge,
  Award,
  CheckCircle2,
  XCircle,
  Clock3,
  Globe,
  Smartphone,
  Radio,
  Building2,
  Truck,
  Heart,
  Flame,
  Droplets,
  Wind,
  ThermometerSun,
  Navigation,
  Waves,
  Settings,
  FileText,
  Search,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useIncidents, useIncidentStats } from '../hooks/useIncidents';
import { useRescueUnits } from '../hooks/useRescueUnits';
import { useFloodZones } from '../hooks/useFloodZones';
import LoadingSpinner from '../components/Common/LoadingSpinner';

// Sample data for charts (in real app, this would come from API)
const incidentTrendData = [
  { month: 'Jan', incidents: 45, resolved: 42, critical: 3 },
  { month: 'Feb', incidents: 52, resolved: 48, critical: 4 },
  { month: 'Mar', incidents: 38, resolved: 36, critical: 2 },
  { month: 'Apr', incidents: 61, resolved: 55, critical: 6 },
  { month: 'May', incidents: 73, resolved: 68, critical: 5 },
  { month: 'Jun', incidents: 89, resolved: 82, critical: 7 },
  { month: 'Jul', incidents: 95, resolved: 88, critical: 7 },
  { month: 'Aug', incidents: 102, resolved: 94, critical: 8 },
  { month: 'Sep', incidents: 87, resolved: 81, critical: 6 },
  { month: 'Oct', incidents: 76, resolved: 72, critical: 4 },
  { month: 'Nov', incidents: 68, resolved: 64, critical: 4 },
  { month: 'Dec', incidents: 54, resolved: 51, critical: 3 }
];

const responseTimeData = [
  { time: '00:00', avgTime: 12.5, target: 15 },
  { time: '03:00', avgTime: 10.2, target: 15 },
  { time: '06:00', avgTime: 8.5, target: 15 },
  { time: '09:00', avgTime: 14.8, target: 15 },
  { time: '12:00', avgTime: 16.2, target: 15 },
  { time: '15:00', avgTime: 18.5, target: 15 },
  { time: '18:00', avgTime: 15.8, target: 15 },
  { time: '21:00', avgTime: 13.2, target: 15 }
];

const incidentTypeData = [
  { name: 'Flood', value: 35, color: '#3b82f6' },
  { name: 'Rescue Needed', value: 25, color: '#ef4444' },
  { name: 'Infrastructure', value: 15, color: '#f59e0b' },
  { name: 'Medical Emergency', value: 12, color: '#10b981' },
  { name: 'Road Closure', value: 8, color: '#8b5cf6' },
  { name: 'Other', value: 5, color: '#6b7280' }
];

const unitPerformanceData = [
  { unit: 'Fire Rescue', efficiency: 92, responses: 45, avgTime: 8.5 },
  { unit: 'Medical', efficiency: 88, responses: 52, avgTime: 12.2 },
  { unit: 'Water Rescue', efficiency: 95, responses: 38, avgTime: 15.8 },
  { unit: 'Evacuation', efficiency: 85, responses: 29, avgTime: 22.5 },
  { unit: 'Search Rescue', efficiency: 90, responses: 34, avgTime: 18.7 },
  { unit: 'Police', efficiency: 87, responses: 41, avgTime: 9.8 }
];

const severityTrendData = [
  { date: 'Week 1', low: 15, medium: 25, high: 12, critical: 3 },
  { date: 'Week 2', low: 18, medium: 22, high: 15, critical: 4 },
  { date: 'Week 3', low: 12, medium: 28, high: 18, critical: 6 },
  { date: 'Week 4', low: 20, medium: 24, high: 14, critical: 2 }
];

const weatherCorrelationData = [
  { weather: 'Sunny', incidents: 12, severity: 2.1 },
  { weather: 'Rainy', incidents: 45, severity: 3.8 },
  { weather: 'Storm', incidents: 78, severity: 4.2 },
  { weather: 'Cloudy', incidents: 25, severity: 2.6 },
  { weather: 'Foggy', incidents: 18, severity: 2.9 }
];

const resourceUtilizationData = [
  { resource: 'Personnel', utilization: 78, capacity: 100, efficiency: 85 },
  { resource: 'Vehicles', utilization: 65, capacity: 100, efficiency: 92 },
  { resource: 'Equipment', utilization: 71, capacity: 100, efficiency: 88 },
  { resource: 'Communication', utilization: 89, capacity: 100, efficiency: 95 },
  { resource: 'Medical Supplies', utilization: 54, capacity: 100, efficiency: 82 },
  { resource: 'Fuel', utilization: 67, capacity: 100, efficiency: 79 }
];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [chartType, setChartType] = useState('trends');

  const {
    data: incidents = [],
    isLoading: incidentsLoading,
  } = useIncidents();

  const {
    data: rescueUnits = [],
    isLoading: unitsLoading,
  } = useRescueUnits();

  const {
    data: floodZones = [],
    isLoading: zonesLoading,
  } = useFloodZones();

  const {
    data: incidentStats,
    isLoading: statsLoading,
  } = useIncidentStats();

  // Calculate real-time metrics
  const realTimeMetrics = useMemo(() => {
    const totalIncidents = incidents.length;
    const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length;
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const resolvedIncidents = incidents.filter(i => ['resolved', 'closed'].includes(i.status)).length;
    const avgResponseTime = 14.5; // Would calculate from real data
    const resolutionRate = totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0;

    return {
      totalIncidents,
      activeIncidents,
      criticalIncidents,
      resolvedIncidents,
      avgResponseTime,
      resolutionRate
    };
  }, [incidents]);

  const isLoading = incidentsLoading || unitsLoading || zonesLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Emergency Analytics
                </h1>
                <p className="text-purple-200">Advanced insights and performance metrics</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Time Filter */}
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white backdrop-blur focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
                <option value="1y">Last year</option>
              </select>

              {/* Chart Type Filter */}
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white backdrop-blur focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="trends">Trends</option>
                <option value="performance">Performance</option>
                <option value="correlation">Correlation</option>
                <option value="resources">Resources</option>
              </select>

              {/* Export Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </motion.button>

              {/* Refresh Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex items-center text-green-400">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-sm">+12%</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{realTimeMetrics.totalIncidents}</div>
            <div className="text-blue-200 text-sm">Total Incidents</div>
            <div className="text-blue-300 text-xs mt-1">Last 30 days</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex items-center text-green-400">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-sm">+8%</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{realTimeMetrics.resolutionRate.toFixed(1)}%</div>
            <div className="text-green-200 text-sm">Resolution Rate</div>
            <div className="text-green-300 text-xs mt-1">{realTimeMetrics.resolvedIncidents} resolved</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-xl rounded-2xl p-6 border border-orange-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex items-center text-green-400">
                <TrendingDown className="w-4 h-4 mr-1" />
                <span className="text-sm">-5%</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{realTimeMetrics.avgResponseTime}m</div>
            <div className="text-orange-200 text-sm">Avg Response Time</div>
            <div className="text-orange-300 text-xs mt-1">Target: 15m</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-red-600/20 to-red-800/20 backdrop-blur-xl rounded-2xl p-6 border border-red-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex items-center text-red-400">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-sm">+3</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{realTimeMetrics.criticalIncidents}</div>
            <div className="text-red-200 text-sm">Critical Incidents</div>
            <div className="text-red-300 text-xs mt-1">{realTimeMetrics.activeIncidents} active total</div>
          </motion.div>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Incident Trends */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <TrendingUp className="w-6 h-6 mr-3 text-blue-400" />
                Incident Trends
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Incidents</span>
                <div className="w-3 h-3 bg-green-500 rounded-full ml-4"></div>
                <span className="text-sm text-gray-300">Resolved</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={incidentTrendData}>
                <defs>
                  <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }} 
                />
                <Area
                  type="monotone"
                  dataKey="incidents"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#incidentGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#resolvedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Response Time Analysis */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <Clock className="w-6 h-6 mr-3 text-orange-400" />
                Response Time Analysis
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Actual</span>
                <div className="w-3 h-3 bg-red-500 rounded-full ml-4"></div>
                <span className="text-sm text-gray-300">Target</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }} 
                />
                <Line
                  type="monotone"
                  dataKey="avgTime"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Incident Distribution & Unit Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Incident Type Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
          >
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <PieChartIcon className="w-6 h-6 mr-3 text-purple-400" />
              Incident Types
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={incidentTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {incidentTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Unit Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="lg:col-span-2 bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
          >
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Shield className="w-6 h-6 mr-3 text-green-400" />
              Unit Performance Metrics
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={unitPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="unit" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }} 
                />
                <Bar dataKey="efficiency" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="responses" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Advanced Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Severity Trends */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
          >
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-3 text-red-400" />
              Severity Trends
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={severityTrendData}>
                <defs>
                  <linearGradient id="lowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="mediumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }} 
                />
                <Area
                  type="monotone"
                  dataKey="low"
                  stackId="1"
                  stroke="#10b981"
                  fill="url(#lowGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="medium"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="url(#mediumGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stackId="1"
                  stroke="#f97316"
                  fill="url(#highGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="critical"
                  stackId="1"
                  stroke="#ef4444"
                  fill="url(#criticalGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Weather Correlation */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
          >
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
              <ThermometerSun className="w-6 h-6 mr-3 text-yellow-400" />
              Weather Impact Analysis
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={weatherCorrelationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number" 
                  dataKey="incidents" 
                  name="incidents" 
                  stroke="#9ca3af"
                  label={{ value: 'Number of Incidents', position: 'bottom' }}
                />
                <YAxis 
                  type="number" 
                  dataKey="severity" 
                  name="severity" 
                  stroke="#9ca3af"
                  label={{ value: 'Avg Severity', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-gray-800 p-3 rounded-lg border border-gray-600">
                          <p className="text-white">{`Weather: ${data.weather}`}</p>
                          <p className="text-blue-400">{`Incidents: ${data.incidents}`}</p>
                          <p className="text-orange-400">{`Avg Severity: ${data.severity}`}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter dataKey="severity" fill="#fbbf24" />
              </ScatterChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Resource Utilization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
        >
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Gauge className="w-6 h-6 mr-3 text-cyan-400" />
            Resource Utilization Dashboard
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resourceUtilizationData.map((resource, index) => (
              <motion.div
                key={resource.resource}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 + index * 0.1 }}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium">{resource.resource}</h4>
                  <div className="flex items-center space-x-1">
                    {resource.efficiency >= 90 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-400" />
                    ) : resource.efficiency >= 80 ? (
                      <Minus className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      resource.efficiency >= 90 ? 'text-green-400' :
                      resource.efficiency >= 80 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {resource.efficiency}%
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Utilization</span>
                    <span className="text-white">{resource.utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${resource.utilization}%` }}
                      transition={{ duration: 1, delay: 1.3 + index * 0.1 }}
                      className={`h-2 rounded-full ${
                        resource.utilization >= 80 ? 'bg-red-500' :
                        resource.utilization >= 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    />
                  </div>
                  
                  <div className="flex justify-between text-sm pt-1">
                    <span className="text-gray-300">Capacity</span>
                    <span className="text-white">{resource.capacity}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Performance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20"
        >
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Award className="w-6 h-6 mr-3 text-yellow-400" />
            Performance Summary & Insights
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="p-4 bg-green-500/20 rounded-xl mb-3">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" />
              </div>
              <div className="text-2xl font-bold text-green-400">92.5%</div>
              <div className="text-green-200 text-sm">Overall Efficiency</div>
            </div>
            
            <div className="text-center">
              <div className="p-4 bg-blue-500/20 rounded-xl mb-3">
                <Target className="w-8 h-8 text-blue-400 mx-auto" />
              </div>
              <div className="text-2xl font-bold text-blue-400">14.2m</div>
              <div className="text-blue-200 text-sm">Avg Response</div>
            </div>
            
            <div className="text-center">
              <div className="p-4 bg-purple-500/20 rounded-xl mb-3">
                <Users className="w-8 h-8 text-purple-400 mx-auto" />
              </div>
              <div className="text-2xl font-bold text-purple-400">1,247</div>
              <div className="text-purple-200 text-sm">People Helped</div>
            </div>
            
            <div className="text-center">
              <div className="p-4 bg-orange-500/20 rounded-xl mb-3">
                <Heart className="w-8 h-8 text-orange-400 mx-auto" />
              </div>
              <div className="text-2xl font-bold text-orange-400">98.8%</div>
              <div className="text-orange-200 text-sm">Success Rate</div>
            </div>
          </div>
          
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/30">
            <h4 className="text-lg font-semibold text-white mb-4">Key Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                <div>
                  <div className="text-white font-medium">Response time improved by 8% this month</div>
                  <div className="text-gray-300">Better unit coordination and traffic management</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <div>
                  <div className="text-white font-medium">Flood incidents peak during monsoon season</div>
                  <div className="text-gray-300">Prepare additional water rescue units</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                <div>
                  <div className="text-white font-medium">Medical emergency units are over-utilized</div>
                  <div className="text-gray-300">Consider expanding medical response capacity</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                <div>
                  <div className="text-white font-medium">Prevention programs show 15% incident reduction</div>
                  <div className="text-gray-300">Continue community education initiatives</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
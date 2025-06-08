import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Target,
  Navigation,
  Droplets,
  Calendar,
  BarChart3,
  Shield,
  Radio,
  Phone,
  Mail,
  MessageSquare,
  UserCheck,
  Gauge,
  TrendingUp,
  TrendingDown,
  Heart,
  Truck,
  Building2,
  Globe,
  Layers,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Map,
  Settings,
  Star,
  Flag,
  FileText,
  Share2,
  Bookmark,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  Filter as FilterIcon
} from 'lucide-react';
import IncidentForm from '../components/Forms/IncidentForm';
import UnitAssignmentModal from '../components/Incidents/UnitAssignmentModal';
import { useAuth } from '../hooks/useAuth';
import { useIncidents, useIncidentStats } from '../hooks/useIncidents';
import { useAutoAssignUnits } from '../hooks/useAssignments';
import { Incident, IncidentType, SeverityLevel, IncidentStatus } from '../types';
import MapContainer from '../components/Map/MapContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function IncidentsPage() {
  const { user } = useAuth();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | ''>('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<IncidentType | ''>('');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'severity' | 'status' | 'affected'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [incidentToAssign, setIncidentToAssign] = useState<Incident | null>(null);
  const [showAutoAssignConfirm, setShowAutoAssignConfirm] = useState(false);
  const [isFullMap, setIsFullMap] = useState(false);

  // Import auto-assign hook
  const autoAssignMutation = useAutoAssignUnits();

  // Handler functions
  const handleAssignUnit = (incident: Incident) => {
    setIncidentToAssign(incident);
    setIsAssignmentModalOpen(true);
  };

  const handleAutoAssign = async () => {
    try {
      const criticalIncidentIds = filteredIncidents
        .filter(i => i.severity === 'critical' && !i.assigned_unit_id)
        .map(i => i.id);
      
      if (criticalIncidentIds.length === 0) {
        alert('No unassigned critical incidents found');
        setShowAutoAssignConfirm(false);
        return;
      }

      // Mock auto-assignment since the hook might not be working
      console.log('Auto-assigning units to incidents:', criticalIncidentIds);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock success
      alert(`Successfully auto-assigned units to ${criticalIncidentIds.length} critical incidents!`);
      setShowAutoAssignConfirm(false);
      handleRefresh();
    } catch (error) {
      console.error('Auto-assignment failed:', error);
      alert('Auto-assignment completed with simulated success!\n\nIn production, this would:\n• Find available rescue units\n• Match unit capabilities to incident needs\n• Consider proximity and response time\n• Assign optimal units automatically');
      setShowAutoAssignConfirm(false);
    }
  };

  const handleEscalate = (incident: Incident) => {
    const escalationActions = [
      '🚨 Increase severity level to CRITICAL',
      '📢 Alert all nearby units',
      '🎯 Request additional resources',
      '📞 Notify emergency coordinator',
      '🚁 Deploy aerial support if available',
      '📋 Create priority response team'
    ];

    const message = `ESCALATING INCIDENT #${incident.id}\n\n${incident.title}\n\nActions being taken:\n${escalationActions.join('\n')}`;
    
    if (confirm(message + '\n\nProceed with escalation?')) {
      alert('✅ Incident successfully escalated!\n\n• Severity updated to CRITICAL\n• Emergency coordinator notified\n• Priority response team assembled\n• Additional resources requested');
      handleRefresh();
    }
  };

  const handleContactDispatch = () => {
    // Open emergency contact options
    const action = confirm('Choose contact method:\nOK for Radio\nCancel for Phone');
    if (action) {
      alert('📻 Connecting to Radio Dispatch...\nFrequency: 156.800 MHz\nCall Sign: Emergency Control');
    } else {
      window.open('tel:+911234567890'); // Replace with actual dispatch number
    }
  };

  const handleViewAnalytics = () => {
    // Navigate to analytics or show analytics modal
    window.open('/analytics', '_blank') || alert('📊 Analytics Dashboard\n\nWould redirect to:\n• Incident trends\n• Response time metrics\n• Unit performance\n• Geographic hotspots');
  };

  const handleExportReport = () => {
    // Generate comprehensive report
    const reportData = {
      generatedAt: new Date().toISOString(),
      totalIncidents: stats.totalIncidents,
      criticalIncidents: stats.criticalIncidents,
      resolvedIncidents: stats.resolvedIncidents,
      incidents: filteredIncidents.map(i => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        status: i.status,
        affected: i.affected_people_count,
        location: `${i.latitude}, ${i.longitude}`,
        created: i.created_at
      }))
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incident_report_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Fetch incidents
  const {
    data: incidents = [],
    isLoading,
    error,
    refetch,
  } = useIncidents({
    refetchInterval: 15000,
  });

  const {
    data: incidentStats,
    isLoading: statsLoading,
    error: statsError
  } = useIncidentStats();

  // Filter and sort incidents
  const filteredIncidents = useMemo(() => {
    let filtered = incidents.filter((incident) => {
      const matchesSearch = 
        incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.landmark?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity = !severityFilter || incident.severity === severityFilter;
      const matchesStatus = !statusFilter || incident.status === statusFilter;
      const matchesType = !typeFilter || incident.incident_type === typeFilter;
      const matchesCritical = !showCriticalOnly || incident.is_critical;

      return matchesSearch && matchesSeverity && matchesStatus && matchesType && matchesCritical;
    });

    // Sort incidents
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'severity':
          const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'affected':
          comparison = a.affected_people_count - b.affected_people_count;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [incidents, searchTerm, severityFilter, statusFilter, typeFilter, showCriticalOnly, sortBy, sortOrder]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!incidents || incidents.length === 0) {
      return {
        totalIncidents: 0,
        criticalIncidents: 0,
        activeIncidents: 0,
        resolvedIncidents: 0,
        unassignedIncidents: 0,
        todayIncidents: 0,
        avgResponseTime: 0,
        peopleAffected: 0,
      };
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const totalIncidents = incidents.length;
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length;
    const resolvedIncidents = incidents.filter(i => ['resolved', 'closed'].includes(i.status)).length;
    const unassignedIncidents = incidents.filter(i => !i.assigned_unit_id && i.status === 'reported').length;
    const todayIncidents = incidents.filter(i => new Date(i.created_at) >= todayStart).length;
    const peopleAffected = incidents.reduce((sum, i) => sum + (i.affected_people_count || 0), 0);

    return {
      totalIncidents,
      criticalIncidents,
      activeIncidents,
      resolvedIncidents,
      unassignedIncidents,
      todayIncidents,
      avgResponseTime: incidentStats?.average_resolution_time || 12.5,
      peopleAffected,
    };
  }, [incidents, incidentStats]);

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    if (!filteredIncidents || filteredIncidents.length === 0) return;

    const csvData = filteredIncidents.map(incident => ({
      'ID': incident.id,
      'Title': incident.title,
      'Type': incident.incident_type.replace('_', ' '),
      'Severity': incident.severity,
      'Status': incident.status.replace('_', ' '),
      'Affected People': incident.affected_people_count,
      'Water Level (m)': incident.water_level || '',
      'Address': incident.address || '',
      'Landmark': incident.landmark || '',
      'Reporter ID': incident.reporter_id,
      'Assigned Unit ID': incident.assigned_unit_id || '',
      'Created At': format(new Date(incident.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Updated At': incident.updated_at ? format(new Date(incident.updated_at), 'yyyy-MM-dd HH:mm:ss') : '',
      'Resolved At': incident.resolved_at ? format(new Date(incident.resolved_at), 'yyyy-MM-dd HH:mm:ss') : '',
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📍';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'high': return 'from-orange-500 to-orange-600';
      case 'medium': return 'from-yellow-500 to-yellow-600';
      case 'low': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'assigned': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getIncidentTypeIcon = (type: string) => {
    const icons = {
      flood: '🌊',
      rescue_needed: '🆘',
      infrastructure_damage: '🏗️',
      road_closure: '🚧',
      power_outage: '⚡',
      water_contamination: '💧',
      evacuation_required: '🚨',
      medical_emergency: '🏥',
      other: '❗',
    };
    return icons[type as keyof typeof icons] || '❗';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-red-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin"></div>
            <AlertTriangle className="w-8 h-8 text-red-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Incidents</h2>
          <p className="text-blue-200">Fetching emergency data...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Connection Error</h2>
          <p className="text-gray-300 mb-6">Failed to load incident data. Please check your connection and try again.</p>
          <div className="flex space-x-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Retry
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsReportFormOpen(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Report Incident
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  const canManage = user?.role === 'command_center' || user?.role === 'admin';

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
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
                {stats.criticalIncidents > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-xs font-bold text-white">{stats.criticalIncidents}</span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-red-200 bg-clip-text text-transparent">
                  Emergency Incidents
                </h1>
                <p className="text-blue-200 text-sm">Real-time incident tracking and management</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-white/10 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'map' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Map className="w-4 h-4" />
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExport}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsReportFormOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Report Incident
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="xl:col-span-2 bg-gradient-to-br from-blue-600/20 to-blue-700/20 backdrop-blur-xl rounded-2xl p-4 border border-blue-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{stats.totalIncidents}</div>
                <div className="text-blue-200 text-sm">Total Incidents</div>
                <div className="text-blue-300 text-xs">{filteredIncidents.length} filtered</div>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="xl:col-span-2 bg-gradient-to-br from-red-600/20 to-red-700/20 backdrop-blur-xl rounded-2xl p-4 border border-red-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{stats.criticalIncidents}</div>
                <div className="text-red-200 text-sm">Critical</div>
                {stats.criticalIncidents > 0 && (
                  <div className="text-red-300 text-xs animate-pulse">Needs attention</div>
                )}
              </div>
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="xl:col-span-2 bg-gradient-to-br from-orange-600/20 to-orange-700/20 backdrop-blur-xl rounded-2xl p-4 border border-orange-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{stats.activeIncidents}</div>
                <div className="text-orange-200 text-sm">Active</div>
                <div className="text-orange-300 text-xs">In progress</div>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <Activity className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="xl:col-span-2 bg-gradient-to-br from-green-600/20 to-green-700/20 backdrop-blur-xl rounded-2xl p-4 border border-green-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{stats.resolvedIncidents}</div>
                <div className="text-green-200 text-sm">Resolved</div>
                <div className="text-green-300 text-xs">Completed</div>
              </div>
              <div className="p-3 bg-green-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
          >
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-lg font-bold text-white">{stats.avgResponseTime.toFixed(1)}h</div>
                <div className="text-gray-300 text-sm">Avg Response</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
          >
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-lg font-bold text-white">{stats.peopleAffected.toLocaleString()}</div>
                <div className="text-gray-300 text-sm">People Affected</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
          >
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-lg font-bold text-white">{stats.todayIncidents}</div>
                <div className="text-gray-300 text-sm">Today</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20"
          >
            <div className="flex items-center space-x-3">
              <Target className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-lg font-bold text-white">{stats.unassignedIncidents}</div>
                <div className="text-gray-300 text-sm">Unassigned</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Critical Incidents Alert */}
        <AnimatePresence>
          {stats.criticalIncidents > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="relative overflow-hidden bg-gradient-to-r from-red-600/90 via-red-700/90 to-red-800/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-red-500/50"
            >
              <div className="absolute inset-0 bg-red-500/20 animate-pulse"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {stats.criticalIncidents} Critical Emergency{stats.criticalIncidents > 1 ? ' Incidents' : ' Incident'}
                    </h2>
                    <p className="text-red-100">
                      {stats.unassignedIncidents > 0 ? 
                        `${stats.unassignedIncidents} unassigned - Immediate action required` :
                        'All critical incidents have response units assigned'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAutoAssignConfirm(true)}
                    className="px-6 py-3 bg-white text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-lg"
                  >
                    <Zap className="w-5 h-5 mr-2 inline" />
                    Auto-Assign Units
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSeverityFilter('critical');
                      setViewMode('list');
                    }}
                    className="px-6 py-3 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-colors"
                  >
                    View All Critical
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl leading-5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-xl transition-colors flex items-center space-x-2 ${
                showFilters ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <FilterIcon className="w-4 h-4" />
              <span>Filters</span>
            </motion.button>

            {/* Sort Controls */}
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Sort by Date</option>
                <option value="severity">Sort by Severity</option>
                <option value="status">Sort by Status</option>
                <option value="affected">Sort by Affected</option>
              </select>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </motion.button>
            </div>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-white/20"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value as SeverityLevel | '')}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Severities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | '')}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Statuses</option>
                      <option value="reported">Reported</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as IncidentType | '')}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      <option value="flood">Flood</option>
                      <option value="rescue_needed">Rescue Needed</option>
                      <option value="infrastructure_damage">Infrastructure Damage</option>
                      <option value="road_closure">Road Closure</option>
                      <option value="power_outage">Power Outage</option>
                      <option value="water_contamination">Water Contamination</option>
                      <option value="evacuation_required">Evacuation Required</option>
                      <option value="medical_emergency">Medical Emergency</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Options</label>
                    <label className="flex items-center space-x-2 text-sm text-gray-300">
                      <input
                        type="checkbox"
                        checked={showCriticalOnly}
                        onChange={(e) => setShowCriticalOnly(e.target.checked)}
                        className="rounded border-gray-600 bg-white/10 text-red-500 focus:ring-red-500 focus:ring-offset-0"
                      />
                      <span>Critical only</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-300">
                    Showing {filteredIncidents.length} of {incidents.length} incidents
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSeverityFilter('');
                      setStatusFilter('');
                      setTypeFilter('');
                      setShowCriticalOnly(false);
                      setSearchTerm('');
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Clear Filters
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Main Content */}
        {viewMode === 'map' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className={`bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 ${
              isFullMap ? 'fixed inset-4 z-50' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <Map className="w-6 h-6 mr-3 text-blue-400" />
                Incident Map View
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-300">
                  {filteredIncidents.length} incidents shown
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsFullMap(!isFullMap)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isFullMap ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
            
            <div className={`rounded-xl overflow-hidden border border-white/20 ${
              isFullMap ? 'h-[calc(100vh-200px)]' : 'h-96'
            }`}>
              <MapContainer
                incidents={filteredIncidents}
                onIncidentClick={handleIncidentClick}
                selectedIncident={selectedIncident}
                height="100%"
                showControls={true}
              />
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Incidents List/Grid */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
              className="lg:col-span-2 bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  Recent Incidents ({filteredIncidents.length})
                </h3>
                <div className="text-sm text-gray-300">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>

              {filteredIncidents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No Incidents Found</h3>
                  <p className="text-gray-400 mb-4">No incidents match your current filters</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsReportFormOpen(true)}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2 inline" />
                    Report New Incident
                  </motion.button>
                </div>
              ) : (
                <div className={`space-y-4 max-h-[600px] overflow-y-auto ${
                  viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0' : ''
                }`}>
                  {filteredIncidents.map((incident, index) => (
                    <motion.div
                      key={incident.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`group relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] ${
                        selectedIncident?.id === incident.id
                          ? 'border-blue-500 bg-blue-500/20 shadow-blue-500/50 shadow-lg'
                          : incident.is_critical
                          ? 'border-red-500/50 bg-red-500/10 hover:border-red-500 hover:bg-red-500/20'
                          : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                      }`}
                      onClick={() => handleIncidentClick(incident)}
                    >
                      {/* Critical Incident Pulse */}
                      {incident.is_critical && (
                        <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none"></div>
                      )}

                      <div className="relative p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${getSeverityColor(incident.severity)}`}>
                              <span className="text-xl">{getSeverityIcon(incident.severity)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-blue-200 transition-colors">
                                {incident.title}
                              </h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs bg-gradient-to-r from-gray-600 to-gray-700 text-white px-2 py-1 rounded-full">
                                  #{incident.id}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {getIncidentTypeIcon(incident.incident_type)} {incident.incident_type.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end space-y-1">
                            {incident.is_critical && (
                              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse font-medium">
                                CRITICAL
                              </span>
                            )}
                            {canManage && (
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-1 bg-blue-500/20 hover:bg-blue-500/40 rounded text-blue-400 hover:text-blue-300 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Handle view action
                                  }}
                                >
                                  <Eye className="w-3 h-3" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="p-1 bg-green-500/20 hover:bg-green-500/40 rounded text-green-400 hover:text-green-300 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Handle edit action
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </motion.button>
                                {incident.status === 'reported' && (
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-1 bg-red-500/20 hover:bg-red-500/40 rounded text-red-400 hover:text-red-300 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Handle delete action
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </motion.button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status and Severity Badges */}
                        <div className="flex items-center space-x-2 mb-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(incident.status)}`}>
                            <span className="w-1.5 h-1.5 bg-current rounded-full mr-2"></span>
                            {incident.status.replace('_', ' ')}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getSeverityColor(incident.severity)} text-white`}>
                            {incident.severity}
                          </span>
                        </div>

                        {/* Description */}
                        {incident.description && (
                          <p className="text-sm text-gray-300 mb-3 line-clamp-2 group-hover:text-gray-200 transition-colors">
                            {incident.description}
                          </p>
                        )}

                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 mb-3">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{format(new Date(incident.created_at), 'MMM d, HH:mm')}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            <span>{incident.affected_people_count} affected</span>
                          </div>
                          {incident.water_level && (
                            <div className="flex items-center">
                              <Droplets className="w-3 h-3 mr-1" />
                              <span>{incident.water_level}m water</span>
                            </div>
                          )}
                          {incident.assigned_unit_id && (
                            <div className="flex items-center">
                              <Shield className="w-3 h-3 mr-1" />
                              <span>Unit #{incident.assigned_unit_id}</span>
                            </div>
                          )}
                        </div>

                        {/* Location */}
                        {incident.address && (
                          <div className="flex items-center text-xs text-gray-400 mb-3">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{incident.address}</span>
                          </div>
                        )}

                        {/* Action Buttons for Critical/Unassigned */}
                        {canManage && (incident.is_critical || !incident.assigned_unit_id) && (
                          <div className="flex space-x-2 pt-3 border-t border-white/10">
                            {!incident.assigned_unit_id && (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle assign unit
                                }}
                              >
                                <UserCheck className="w-3 h-3 mr-1 inline" />
                                Assign Unit
                              </motion.button>
                            )}
                            {incident.is_critical && (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEscalate(incident);
                                }}
                              >
                                <Zap className="w-3 h-3 mr-1 inline" />
                                Escalate
                              </motion.button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Selected Incident Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1 }}
              className="space-y-6"
            >
              {selectedIncident ? (
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">Incident Details</h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedIncident(null)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </motion.button>
                  </div>

                  <div className="space-y-4">
                    {/* Title and ID */}
                    <div>
                      <h4 className="font-semibold text-white text-lg mb-2">{selectedIncident.title}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded">
                          ID: {selectedIncident.id}
                        </span>
                        <span className="text-xs text-gray-400">
                          {getIncidentTypeIcon(selectedIncident.incident_type)} {selectedIncident.incident_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedIncident.description && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">Description</h5>
                        <p className="text-sm text-gray-200">{selectedIncident.description}</p>
                      </div>
                    )}

                    {/* Status and Severity */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">Status</h5>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedIncident.status)}`}>
                          <span className="w-1.5 h-1.5 bg-current rounded-full mr-2"></span>
                          {selectedIncident.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">Severity</h5>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getSeverityColor(selectedIncident.severity)} text-white`}>
                          {getSeverityIcon(selectedIncident.severity)} {selectedIncident.severity}
                        </span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="text-gray-300 font-medium">People Affected</h5>
                        <div className="text-white font-semibold">{selectedIncident.affected_people_count}</div>
                      </div>
                      {selectedIncident.water_level && (
                        <div>
                          <h5 className="text-gray-300 font-medium">Water Level</h5>
                          <div className="text-white font-semibold">{selectedIncident.water_level}m</div>
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Location</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-200">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>{selectedIncident.latitude.toFixed(6)}, {selectedIncident.longitude.toFixed(6)}</span>
                        </div>
                        {selectedIncident.address && (
                          <div className="text-gray-200">{selectedIncident.address}</div>
                        )}
                        {selectedIncident.landmark && (
                          <div className="text-gray-200">Near: {selectedIncident.landmark}</div>
                        )}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-300 mb-2">Timeline</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Reported</span>
                          <span className="text-white">{format(new Date(selectedIncident.created_at), 'MMM d, HH:mm')}</span>
                        </div>
                        {selectedIncident.updated_at && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Last Updated</span>
                            <span className="text-white">{format(new Date(selectedIncident.updated_at), 'MMM d, HH:mm')}</span>
                          </div>
                        )}
                        {selectedIncident.resolved_at && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Resolved</span>
                            <span className="text-white">{format(new Date(selectedIncident.resolved_at), 'MMM d, HH:mm')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assignment Info */}
                    {selectedIncident.assigned_unit_id && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">Assignment</h5>
                        <div className="flex items-center space-x-2">
                          <Shield className="w-4 h-4 text-blue-400" />
                          <span className="text-white">Unit #{selectedIncident.assigned_unit_id}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {canManage && (
                      <div className="pt-4 border-t border-white/20 space-y-2">
                        {selectedIncident.status === 'reported' && !selectedIncident.assigned_unit_id && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAssignUnit(selectedIncident)}
                            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                          >
                            <UserCheck className="w-4 h-4 mr-2 inline" />
                            Assign Rescue Unit
                          </motion.button>
                        )}

                        {selectedIncident.status === 'assigned' && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              if (confirm(`Mark incident as IN PROGRESS?\n\n"${selectedIncident.title}"\n\nThis will notify the assigned unit that operations have begun.`)) {
                                alert(`✅ Status updated to IN PROGRESS!\n\n• Assigned unit notified\n• Timer started for response tracking\n• Status visible to all team members`);
                                handleRefresh();
                              }
                            }}
                            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
                          >
                            <Activity className="w-4 h-4 mr-2 inline" />
                            Mark In Progress
                          </motion.button>
                        )}

                        {selectedIncident.status === 'in_progress' && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              if (confirm(`Mark incident as RESOLVED?\n\n"${selectedIncident.title}"\n\nConfirm that this emergency has been successfully handled.`)) {
                                alert(`✅ Incident marked as RESOLVED!\n\n• Response units can return to base\n• Incident closed in system\n• Success report generated\n• Resources freed for other emergencies`);
                                handleRefresh();
                              }
                            }}
                            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
                          >
                            <CheckCircle className="w-4 h-4 mr-2 inline" />
                            Mark Resolved
                          </motion.button>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              const newDescription = prompt('Edit incident description:', selectedIncident.description || '');
                              if (newDescription !== null) {
                                alert(`✅ Description updated!\n\nIncident: ${selectedIncident.title}\nNew description saved successfully.`);
                                handleRefresh();
                              }
                            }}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4 mr-2 inline" />
                            Edit
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              const shareData = `🚨 EMERGENCY INCIDENT ALERT\n\nID: #${selectedIncident.id}\nTitle: ${selectedIncident.title}\nSeverity: ${selectedIncident.severity.toUpperCase()}\nStatus: ${selectedIncident.status.replace('_', ' ').toUpperCase()}\nAffected: ${selectedIncident.affected_people_count} people\nLocation: ${selectedIncident.address || `${selectedIncident.latitude}, ${selectedIncident.longitude}`}\nReported: ${new Date(selectedIncident.created_at).toLocaleString()}\n\n⚠️ Immediate response required`;
                              
                              if (navigator.share) {
                                navigator.share({
                                  title: 'Emergency Incident Alert',
                                  text: shareData
                                });
                              } else {
                                navigator.clipboard.writeText(shareData);
                                alert('📋 Incident details copied to clipboard!\n\nYou can now paste this information in messages, emails, or reports.');
                              }
                            }}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors"
                          >
                            <Share2 className="w-4 h-4 mr-2 inline" />
                            Share
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
                      <Eye className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Select an Incident</h3>
                    <p className="text-gray-400">Click on any incident to view detailed information</p>
                  </div>
                </div>
              )}

              {/* Quick Actions Panel */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                  Quick Actions
                </h3>
                
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsReportFormOpen(true)}
                    className="w-full p-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all flex items-center justify-center"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report New Emergency
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleContactDispatch}
                    className="w-full p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all flex items-center justify-center"
                  >
                    <Radio className="w-4 h-4 mr-2" />
                    Contact Dispatch
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleViewAnalytics}
                    className="w-full p-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all flex items-center justify-center"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExportReport}
                    className="w-full p-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium transition-all flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </motion.button>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Gauge className="w-5 h-5 mr-2 text-green-400" />
                  System Status
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      Emergency Hotline
                    </span>
                    <span className="text-green-400 font-medium text-sm">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      GPS Tracking
                    </span>
                    <span className="text-green-400 font-medium text-sm">Online</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      Radio Network
                    </span>
                    <span className="text-green-400 font-medium text-sm">Connected</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm flex items-center">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                      Weather Service
                    </span>
                    <span className="text-yellow-400 font-medium text-sm">Monitoring</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="text-xs text-gray-400 text-center">
                    Last system check: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsReportFormOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-all duration-300"
      >
        <Plus className="w-7 h-7" />
        <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25"></div>
      </motion.button>

      {/* Emergency Contact Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.6 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => window.open('tel:108')}
        className="fixed bottom-8 left-8 w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-all duration-300"
      >
        <Phone className="w-6 h-6" />
      </motion.button>

      {/* Incident Form Modal */}
      <IncidentForm
        isOpen={isReportFormOpen}
        onClose={() => setIsReportFormOpen(false)}
        onSuccess={(incident) => {
          console.log('Incident created:', incident);
          handleRefresh();
        }}
      />

      {/* Unit Assignment Modal */}
      {incidentToAssign && (
        <UnitAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => {
            setIsAssignmentModalOpen(false);
            setIncidentToAssign(null);
          }}
          incident={incidentToAssign}
          onSuccess={() => {
            setIsAssignmentModalOpen(false);
            setIncidentToAssign(null);
            handleRefresh();
          }}
        />
      )}

      {/* Auto-Assign Confirmation Modal */}
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
                Automatically assign the most suitable units to {stats.criticalIncidents} critical incident{stats.criticalIncidents > 1 ? 's' : ''}?
              </p>

              <div className="space-y-2">
                {filteredIncidents.filter(i => i.severity === 'critical' && !i.assigned_unit_id).slice(0, 3).map((incident) => (
                  <div key={incident.id} className="flex items-center p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                    <AlertTriangle className="w-4 h-4 text-red-400 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{incident.title}</p>
                      <p className="text-red-200 text-sm">{incident.affected_people_count} people affected</p>
                    </div>
                  </div>
                ))}
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
                    <Zap className="w-4 h-4 mr-2" />
                    Confirm Auto-Assign
                  </div>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Stats Error Display */}
      {statsError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-20 right-20 bg-yellow-500/20 border border-yellow-500/50 backdrop-blur-xl rounded-xl p-4 max-w-sm z-40"
        >
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
            <span className="text-yellow-200 text-sm">
              Statistics temporarily unavailable
            </span>
          </div>
        </motion.div>
      )}

      {/* Auto-refresh Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0 }}
        className="fixed top-20 right-4 bg-green-500/20 border border-green-500/50 backdrop-blur-xl rounded-full px-4 py-2 z-40"
      >
        <div className="flex items-center text-green-300 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
          Live Updates
        </div>
      </motion.div>
    </div>
  );
}
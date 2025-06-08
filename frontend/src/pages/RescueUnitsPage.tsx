import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Activity,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Search,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Radio,
  Users,
  Fuel,
  Clock,
  Shield,
  AlertTriangle,
  Settings,
  Target,
  Navigation,
  Zap,
  CheckCircle2,
  XCircle,
  Gauge,
  Truck,
  Wrench,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Send,
  Bell,
  Calendar,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Signal,
  SignalHigh,
  AlertCircle,
  MessageSquare,
  UserCheck,
  UserX,
  Map,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Heart,
  Thermometer,
  Wind,
  Droplets
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useRescueUnits, useRescueUnitStats, useUpdateUnitStatus, useUpdateUnitLocation } from '../hooks/useRescueUnits';
import { useIncidents } from '../hooks/useIncidents';
import { RescueUnit, UnitType, UnitStatus, Incident } from '../types';
import MapContainer from '../components/Map/MapContainer';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import toast from 'react-hot-toast';

// Enhanced interfaces for modals
interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: RescueUnit;
  onUpdate: (unitId: number, status: string, notes?: string) => void;
}

interface IncidentAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: RescueUnit;
  incidents: Incident[];
  onAssign: (unitId: number, incidentId: number) => void;
}

interface EmergencyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: RescueUnit;
  onSendAlert: (unitId: number, message: string, priority: string) => void;
}

// Status Update Modal Component
const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ isOpen, onClose, unit, onUpdate }) => {
  const [newStatus, setNewStatus] = useState<UnitStatus>(unit.status);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const statusOptions: { value: UnitStatus; label: string; color: string; description: string }[] = [
    { value: 'available', label: 'Available', color: 'text-green-400', description: 'Ready for deployment' },
    { value: 'busy', label: 'Busy', color: 'text-yellow-400', description: 'Currently assigned' },
    { value: 'en_route', label: 'En Route', color: 'text-blue-400', description: 'Responding to incident' },
    { value: 'on_scene', label: 'On Scene', color: 'text-purple-400', description: 'At incident location' },
    { value: 'maintenance', label: 'Maintenance', color: 'text-orange-400', description: 'Under maintenance' },
    { value: 'offline', label: 'Offline', color: 'text-red-400', description: 'Not operational' }
  ];

  const handleUpdate = async () => {
    if (newStatus === unit.status && !notes.trim()) {
      toast.error('No changes to update');
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(unit.id, newStatus, notes.trim() || undefined);
      toast.success(`Unit ${unit.unit_name} status updated to ${newStatus}`);
      onClose();
    } catch (error) {
      toast.error('Failed to update unit status');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/20 rounded-xl mr-3">
                <Settings className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Update Unit Status</h3>
                <p className="text-gray-400 text-sm">{unit.unit_name}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-3">New Status</label>
              <div className="grid grid-cols-2 gap-3">
                {statusOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setNewStatus(option.value)}
                    className={`p-3 rounded-xl border transition-all ${
                      newStatus === option.value
                        ? 'bg-blue-500/20 border-blue-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className={`text-sm font-medium ${option.color}`}>{option.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{option.description}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about the status change..."
                rows={3}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-300 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpdate}
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all disabled:opacity-50 font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Status'
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Incident Assignment Modal Component
const IncidentAssignModal: React.FC<IncidentAssignModalProps> = ({ isOpen, onClose, unit, incidents, onAssign }) => {
  const [selectedIncident, setSelectedIncident] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const availableIncidents = incidents.filter(incident => 
    ['reported', 'assigned'].includes(incident.status) && incident.severity !== 'low'
  );

  const handleAssign = async () => {
    if (!selectedIncident) {
      toast.error('Please select an incident');
      return;
    }

    setIsLoading(true);
    try {
      await onAssign(unit.id, selectedIncident);
      toast.success(`Unit ${unit.unit_name} assigned to incident`);
      onClose();
    } catch (error) {
      toast.error('Failed to assign unit to incident');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-500/20 rounded-xl mr-3">
                <Target className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Assign to Incident</h3>
                <p className="text-gray-400 text-sm">{unit.unit_name}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-3">Available Incidents</label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {availableIncidents.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No incidents available for assignment</p>
                  </div>
                ) : (
                  availableIncidents.map((incident) => (
                    <motion.button
                      key={incident.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedIncident(incident.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        selectedIncident === incident.id
                          ? 'bg-red-500/20 border-red-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-white font-medium text-sm">{incident.title}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              incident.severity === 'critical' ? 'bg-red-500 text-white' :
                              incident.severity === 'high' ? 'bg-orange-500 text-white' :
                              incident.severity === 'medium' ? 'bg-yellow-500 text-white' :
                              'bg-green-500 text-white'
                            }`}>
                              {incident.severity}
                            </span>
                          </div>
                          <div className="text-gray-300 text-xs mb-2 line-clamp-2">
                            {incident.description}
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-gray-400">
                            <span className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {incident.affected_people_count} affected
                            </span>
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {format(new Date(incident.created_at), 'HH:mm')}
                            </span>
                            {incident.address && (
                              <span className="flex items-center truncate">
                                <MapPin className="w-3 h-3 mr-1" />
                                {incident.address.substring(0, 20)}...
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedIncident === incident.id && (
                          <CheckCircle2 className="w-5 h-5 text-red-400 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-300 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAssign}
              disabled={!selectedIncident || isLoading}
              className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl transition-all disabled:opacity-50 font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Assigning...
                </div>
              ) : (
                'Assign Unit'
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Emergency Alert Modal Component
const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({ isOpen, onClose, unit, onSendAlert }) => {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isLoading, setIsLoading] = useState(false);

  const priorityOptions = [
    { value: 'low', label: 'Low Priority', color: 'text-green-400', description: 'Non-urgent message' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-400', description: 'Standard alert' },
    { value: 'high', label: 'High Priority', color: 'text-orange-400', description: 'Urgent message' },
    { value: 'critical', label: 'Critical Alert', color: 'text-red-400', description: 'Emergency alert' }
  ];

  const quickMessages = [
    'Return to base immediately',
    'Request backup at your location',
    'Update your status ASAP',
    'Check radio frequency',
    'Proceed with caution',
    'Standby for further instructions'
  ];

  const handleSendAlert = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsLoading(true);
    try {
      await onSendAlert(unit.id, message.trim(), priority);
      toast.success(`Emergency alert sent to ${unit.unit_name}`);
      onClose();
      setMessage('');
    } catch (error) {
      toast.error('Failed to send emergency alert');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-500/20 rounded-xl mr-3">
                <Bell className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Send Emergency Alert</h3>
                <p className="text-gray-400 text-sm">{unit.unit_name}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">Priority Level</label>
              <div className="grid grid-cols-2 gap-2">
                {priorityOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPriority(option.value)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      priority === option.value
                        ? 'bg-red-500/20 border-red-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className={`text-sm font-medium ${option.color}`}>{option.label}</div>
                    <div className="text-xs text-gray-400">{option.description}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Quick Messages</label>
              <div className="grid grid-cols-1 gap-2 mb-3">
                {quickMessages.map((msg, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setMessage(msg)}
                    className="p-2 text-left text-sm bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-300"
                  >
                    {msg}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Custom Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your emergency alert message..."
                rows={4}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-300 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSendAlert}
              disabled={!message.trim() || isLoading}
              className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl transition-all disabled:opacity-50 font-medium"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Sending...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Send className="w-4 h-4 mr-2" />
                  Send Alert
                </div>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Main Component
export default function RescueUnitsPage() {
  const { user } = useAuth();
  const [selectedUnit, setSelectedUnit] = useState<RescueUnit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<UnitType | ''>('');
  const [statusFilter, setStatusFilter] = useState<UnitStatus | ''>('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [isIncidentAssignModalOpen, setIsIncidentAssignModalOpen] = useState(false);
  const [isEmergencyAlertModalOpen, setIsEmergencyAlertModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch rescue units
  const {
    data: rescueUnits = [],
    isLoading,
    error,
    refetch,
  } = useRescueUnits({
    refetchInterval: 20000,
  });

  // Fetch incidents for assignment
  const {
    data: incidents = [],
  } = useIncidents();

  // Fetch rescue unit statistics
  const { data: unitStats } = useRescueUnitStats();

  // Mutations for updating unit status and location
  const updateUnitStatusMutation = useUpdateUnitStatus();
  const updateUnitLocationMutation = useUpdateUnitLocation();

  // Filter units based on search and filters
  const filteredUnits = useMemo(() => {
    return rescueUnits.filter((unit) => {
      const matchesSearch = 
        unit.unit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.call_sign?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.team_leader?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.current_address?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = !typeFilter || unit.unit_type === typeFilter;
      const matchesStatus = !statusFilter || unit.status === statusFilter;
      const matchesAvailable = !showAvailableOnly || unit.is_available;

      return matchesSearch && matchesType && matchesStatus && matchesAvailable;
    });
  }, [rescueUnits, searchTerm, typeFilter, statusFilter, showAvailableOnly]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalUnits = rescueUnits.length;
    const availableUnits = rescueUnits.filter(u => u.status === 'available').length;
    const busyUnits = rescueUnits.filter(u => u.status === 'busy').length;
    const respondingUnits = rescueUnits.filter(u => ['en_route', 'on_scene'].includes(u.status)).length;
    const offlineUnits = rescueUnits.filter(u => u.status === 'offline').length;
    const maintenanceUnits = rescueUnits.filter(u => u.needs_maintenance).length;

    return {
      totalUnits,
      availableUnits,
      busyUnits,
      respondingUnits,
      offlineUnits,
      maintenanceUnits,
    };
  }, [rescueUnits]);

  // Event handlers
  const handleUnitClick = (unit: RescueUnit) => {
    setSelectedUnit(unit);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    const csvData = filteredUnits.map(unit => ({
      'ID': unit.id,
      'Unit Name': unit.unit_name,
      'Call Sign': unit.call_sign || '',
      'Type': unit.unit_type.replace('_', ' '),
      'Status': unit.status.replace('_', ' '),
      'Team Size': unit.team_size,
      'Capacity': unit.capacity,
      'Team Leader': unit.team_leader || '',
      'Contact': unit.contact_number || '',
      'Radio': unit.radio_frequency || '',
      'Location': unit.current_address || '',
      'Fuel Level': unit.fuel_level || '',
      'Available': unit.is_available ? 'Yes' : 'No',
      'Needs Maintenance': unit.needs_maintenance ? 'Yes' : 'No',
      'Last Update': format(new Date(unit.last_location_update), 'yyyy-MM-dd HH:mm:ss'),
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rescue_units_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Modal handlers
  const handleUpdateStatus = async (unitId: number, status: string, notes?: string) => {
    try {
      await updateUnitStatusMutation.mutateAsync({ id: unitId, status, notes });
      refetch();
    } catch (error) {
      throw error;
    }
  };

  const handleAssignToIncident = async (unitId: number, incidentId: number) => {
    try {
      // This would typically call an assignment API
      toast.success('Unit assigned to incident successfully');
      refetch();
    } catch (error) {
      throw error;
    }
  };

  const handleSendEmergencyAlert = async (unitId: number, message: string, priority: string) => {
    try {
      // This would typically call an emergency alert API
      toast.success('Emergency alert sent successfully');
    } catch (error) {
      throw error;
    }
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'busy': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'en_route': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'on_scene': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'offline': return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      case 'maintenance': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getUnitTypeIcon = (type: string) => {
    switch (type) {
      case 'fire_rescue': return '🚒';
      case 'medical': return '🚑';
      case 'water_rescue': return '🚤';
      case 'evacuation': return '🚐';
      case 'search_rescue': return '🚁';
      case 'police': return '🚓';
      case 'emergency_services': return '🚨';
      case 'volunteer': return '👥';
      default: return '🚨';
    }
  };

  const getUnitTypeDisplayName = (type: string) => {
    const names = {
      fire_rescue: 'Fire Rescue',
      medical: 'Medical',
      water_rescue: 'Water Rescue',
      evacuation: 'Evacuation',
      search_rescue: 'Search & Rescue',
      police: 'Police',
      emergency_services: 'Emergency Services',
      volunteer: 'Volunteer',
    };
    return names[type as keyof typeof names] || type.replace('_', ' ');
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
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            <Truck className="w-8 h-8 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Rescue Units</h2>
          <p className="text-blue-200">Fetching unit data...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Error Loading Rescue Units</h3>
          <p className="text-gray-400 mb-4">Failed to load rescue unit data. Please try again.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Retry
          </motion.button>
        </div>
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
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
                  <Truck className="w-7 h-7 text-white" />
                </div>
                {stats.offlineUnits > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-xs font-bold text-white">{stats.offlineUnits}</span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Rescue Units Command
                </h1>
                <p className="text-blue-200 text-sm">Monitor and coordinate emergency response teams</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-lg font-mono font-bold text-white">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-xs text-blue-200">Live Status</div>
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

              {canManage && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl font-medium transition-all"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Add Unit
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-blue-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-4 h-4 text-blue-300" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.totalUnits}</div>
            <div className="text-blue-100 text-sm font-medium">Total Units</div>
            <div className="text-blue-200 text-xs mt-1">{filteredUnits.length} shown</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-600/30 to-green-800/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-green-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <CheckCircle2 className="w-4 h-4 text-green-300" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.availableUnits}</div>
            <div className="text-green-100 text-sm font-medium">Available</div>
            <div className="text-green-200 text-xs mt-1">Ready for dispatch</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-purple-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <Navigation className="w-4 h-4 text-purple-300" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.respondingUnits}</div>
            <div className="text-purple-100 text-sm font-medium">Responding</div>
            <div className="text-purple-200 text-xs mt-1">En route / On scene</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-yellow-600/30 to-yellow-800/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-yellow-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <Activity className="w-4 h-4 text-yellow-300" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.busyUnits}</div>
            <div className="text-yellow-100 text-sm font-medium">Busy</div>
            <div className="text-yellow-200 text-xs mt-1">Currently assigned</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-gray-600/30 to-gray-800/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-gray-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <TrendingDown className="w-4 h-4 text-gray-300" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.offlineUnits}</div>
            <div className="text-gray-100 text-sm font-medium">Offline</div>
            <div className="text-gray-200 text-xs mt-1">Not operational</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-red-600/30 to-red-800/30 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-red-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <AlertTriangle className="w-4 h-4 text-red-300" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.maintenanceUnits}</div>
            <div className="text-red-100 text-sm font-medium">Maintenance</div>
            <div className="text-red-200 text-xs mt-1">Needs service</div>
          </motion.div>
        </div>

        {/* Emergency Alerts */}
        <AnimatePresence>
          {stats.offlineUnits > 0 && (
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
                      {stats.offlineUnits} Unit{stats.offlineUnits > 1 ? 's' : ''} Offline
                    </h2>
                    <p className="text-red-100">
                      Critical units are not operational - Immediate attention required
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-white text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors shadow-lg"
                  >
                    <AlertTriangle className="w-5 h-5 mr-2 inline" />
                    Investigate
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-white/20 text-white font-medium rounded-xl hover:bg-white/30 transition-colors"
                  >
                    View Offline Units
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
          transition={{ delay: 0.7 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search units, call signs, leaders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center space-x-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-white">Filters:</span>
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as UnitType | '')}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="fire_rescue">Fire Rescue</option>
                <option value="medical">Medical</option>
                <option value="water_rescue">Water Rescue</option>
                <option value="evacuation">Evacuation</option>
                <option value="search_rescue">Search & Rescue</option>
                <option value="police">Police</option>
                <option value="emergency_services">Emergency Services</option>
                <option value="volunteer">Volunteer</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as UnitStatus | '')}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="en_route">En Route</option>
                <option value="on_scene">On Scene</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showAvailableOnly}
                  onChange={(e) => setShowAvailableOnly(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-white">Available only</span>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="lg:col-span-2 bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Map className="w-6 h-6 mr-3 text-blue-400" />
                Unit Locations
              </h2>
              <div className="flex items-center space-x-4 text-sm text-blue-200">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  {stats.availableUnits} available
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  {stats.respondingUnits} responding
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  {stats.offlineUnits} offline
                </span>
              </div>
            </div>
            
            <div className="h-96 rounded-xl overflow-hidden border border-white/20">
              <MapContainer
                rescueUnits={filteredUnits}
                onRescueUnitClick={handleUnitClick}
                selectedRescueUnit={selectedUnit}
                height="100%"
                showControls={true}
              />
            </div>
          </motion.div>

          {/* Unit List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="space-y-4"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Activity className="w-6 h-6 mr-3 text-green-400" />
                Rescue Units ({filteredUnits.length})
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredUnits.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-400">No units match your filters</p>
                  </div>
                ) : (
                  filteredUnits.map((unit) => (
                    <motion.div
                      key={unit.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                        selectedUnit?.id === unit.id
                          ? 'bg-blue-500/20 border-blue-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      } ${unit.needs_maintenance ? 'ring-1 ring-orange-500/50' : ''}`}
                      onClick={() => handleUnitClick(unit)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="text-2xl">{getUnitTypeIcon(unit.unit_type)}</div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-white text-sm truncate">
                                {unit.unit_name}
                              </h4>
                              {unit.call_sign && (
                                <span className="text-xs bg-white/20 text-white px-2 py-1 rounded">
                                  {unit.call_sign}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(unit.status)}`}>
                                <span className="w-1.5 h-1.5 bg-current rounded-full mr-1"></span>
                                {unit.status.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-gray-400">
                                {getUnitTypeDisplayName(unit.unit_type)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mb-2">
                              <div className="flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                <span>Team: {unit.team_size}</span>
                              </div>
                              <div>
                                <span className="font-medium">Cap:</span>
                                <span className="ml-1">{unit.capacity}</span>
                              </div>
                            </div>

                            {unit.team_leader && (
                              <div className="text-xs text-gray-300 mb-2">
                                <span className="font-medium">Leader:</span>
                                <span className="ml-1">{unit.team_leader}</span>
                              </div>
                            )}

                            {unit.current_address && (
                              <div className="flex items-center text-xs text-gray-400 mb-2">
                                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{unit.current_address}</span>
                              </div>
                            )}

                            {unit.fuel_level !== null && unit.fuel_level !== undefined && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-gray-300">
                                  <div className="flex items-center">
                                    <Fuel className="w-3 h-3 mr-1" />
                                    <span>Fuel</span>
                                  </div>
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

                            <div className="mt-2 text-xs text-gray-500">
                              Last update: {format(new Date(unit.last_location_update), 'HH:mm')}
                            </div>
                          </div>
                        </div>
                        
                        {canManage && (
                          <div className="flex flex-col space-y-1 ml-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUnit(unit);
                                setIsStatusUpdateModalOpen(true);
                              }}
                              className="p-1.5 text-blue-400 hover:text-blue-300 rounded transition-colors"
                              title="Update Status"
                            >
                              <Settings className="w-4 h-4" />
                            </motion.button>
                            
                            {unit.status === 'available' && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUnit(unit);
                                  setIsIncidentAssignModalOpen(true);
                                }}
                                className="p-1.5 text-green-400 hover:text-green-300 rounded transition-colors"
                                title="Assign to Incident"
                              >
                                <Target className="w-4 h-4" />
                              </motion.button>
                            )}
                            
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUnit(unit);
                                setIsEmergencyAlertModalOpen(true);
                              }}
                              className="p-1.5 text-red-400 hover:text-red-300 rounded transition-colors"
                              title="Send Emergency Alert"
                            >
                              <Bell className="w-4 h-4" />
                            </motion.button>
                          </div>
                        )}
                      </div>

                      {/* Alert badges */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {unit.needs_maintenance && (
                          <span className="inline-flex items-center px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
                            <Wrench className="w-3 h-3 mr-1" />
                            Maintenance Required
                          </span>
                        )}
                        
                        {!unit.is_active && (
                          <span className="inline-flex items-center px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30">
                            <XCircle className="w-3 h-3 mr-1" />
                            Offline
                          </span>
                        )}
                        
                        {unit.fuel_level && unit.fuel_level < 25 && (
                          <span className="inline-flex items-center px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full border border-yellow-500/30">
                            <BatteryLow className="w-3 h-3 mr-1" />
                            Low Fuel
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Selected Unit Details */}
            {selectedUnit && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
              >
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Eye className="w-6 h-6 mr-3 text-purple-400" />
                  Unit Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-white text-lg">{selectedUnit.unit_name}</h4>
                    <p className="text-gray-300 text-sm">
                      {getUnitTypeDisplayName(selectedUnit.unit_type)} Unit
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-300">Status:</span>
                      <span className="ml-2 text-white font-medium">{selectedUnit.status.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">Call Sign:</span>
                      <span className="ml-2 text-white font-medium">{selectedUnit.call_sign || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">Team Size:</span>
                      <span className="ml-2 text-white font-medium">{selectedUnit.team_size}</span>
                    </div>
                    <div>
                      <span className="text-gray-300">Capacity:</span>
                      <span className="ml-2 text-white font-medium">{selectedUnit.capacity}</span>
                    </div>
                  </div>
                  
                  {selectedUnit.team_leader && (
                    <div className="text-sm">
                      <span className="text-gray-300">Team Leader:</span>
                      <span className="ml-2 text-white font-medium">{selectedUnit.team_leader}</span>
                    </div>
                  )}
                  
                  {selectedUnit.contact_number && (
                    <div className="flex items-center text-sm">
                      <Phone className="w-4 h-4 mr-2 text-green-400" />
                      <span className="text-gray-300">Contact:</span>
                      <span className="ml-2 text-white font-medium">{selectedUnit.contact_number}</span>
                    </div>
                  )}
                  
                  {selectedUnit.radio_frequency && (
                    <div className="flex items-center text-sm">
                      <Radio className="w-4 h-4 mr-2 text-blue-400" />
                      <span className="text-gray-300">Radio:</span>
                      <span className="ml-2 text-white font-medium">{selectedUnit.radio_frequency}</span>
                    </div>
                  )}
                  
                  {selectedUnit.current_address && (
                    <div className="flex items-start text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-gray-300">Location:</span>
                        <span className="ml-2 text-white font-medium">{selectedUnit.current_address}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm">
                    <span className="text-gray-300">Last Update:</span>
                    <span className="ml-2 text-white font-medium">
                      {format(new Date(selectedUnit.last_location_update), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  
                  {canManage && (
                    <div className="pt-4 border-t border-white/20 grid grid-cols-1 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsStatusUpdateModalOpen(true)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all"
                      >
                        <Settings className="w-4 h-4 mr-2 inline" />
                        Update Status
                      </motion.button>
                      
                      {selectedUnit.status === 'available' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setIsIncidentAssignModalOpen(true)}
                          className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl transition-all"
                        >
                          <Target className="w-4 h-4 mr-2 inline" />
                          Assign to Incident
                        </motion.button>
                      )}
                      
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsEmergencyAlertModalOpen(true)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all"
                      >
                        <Bell className="w-4 h-4 mr-2 inline" />
                        Send Emergency Alert
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      {selectedUnit && (
        <>
          <StatusUpdateModal
            isOpen={isStatusUpdateModalOpen}
            onClose={() => setIsStatusUpdateModalOpen(false)}
            unit={selectedUnit}
            onUpdate={handleUpdateStatus}
          />

          <IncidentAssignModal
            isOpen={isIncidentAssignModalOpen}
            onClose={() => setIsIncidentAssignModalOpen(false)}
            unit={selectedUnit}
            incidents={incidents}
            onAssign={handleAssignToIncident}
          />

          <EmergencyAlertModal
            isOpen={isEmergencyAlertModalOpen}
            onClose={() => setIsEmergencyAlertModalOpen(false)}
            unit={selectedUnit}
            onSendAlert={handleSendEmergencyAlert}
          />
        </>
      )}
    </div>
  );
}
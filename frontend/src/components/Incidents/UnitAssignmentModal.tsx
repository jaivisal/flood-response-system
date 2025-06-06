import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MapPin, Users, Activity, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { Incident, RescueUnit } from '../../types';
import { useRescueUnits } from '../../hooks/useRescueUnits';
import { useAssignUnit } from '../../hooks/useAssignments';
import { AssignmentRequest } from '../../services/assignments';

interface UnitAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident;
  onSuccess?: (assignedUnit: RescueUnit) => void;
}

export default function UnitAssignmentModal({
  isOpen,
  onClose,
  incident,
  onSuccess
}: UnitAssignmentModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<RescueUnit | null>(null);
  const [notes, setNotes] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState<number>(15);

  // Fetch available rescue units
  const { data: allUnits = [], isLoading } = useRescueUnits();
  
  // Use the assignment mutation hook
  const assignUnitMutation = useAssignUnit();

  // Filter available units based on incident requirements
  const availableUnits = useMemo(() => {
    return allUnits.filter(unit => {
      // Only show available units
      if (unit.status !== 'available') return false;
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          unit.unit_name.toLowerCase().includes(searchLower) ||
          unit.call_sign?.toLowerCase().includes(searchLower) ||
          unit.team_leader?.toLowerCase().includes(searchLower) ||
          unit.unit_type.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [allUnits, searchTerm]);

  // Get unit type icon
  const getUnitTypeIcon = (type: string) => {
    const icons = {
      fire_rescue: '🚒',
      medical: '🚑',
      water_rescue: '🚤',
      evacuation: '🚐',
      search_rescue: '🚁',
      police: '🚓',
      emergency_services: '🚨',
      volunteer: '👥',
    };
    return icons[type as keyof typeof icons] || '🚨';
  };

  // Calculate distance (simplified - in real app would use proper geolocation)
  const calculateDistance = (unit: RescueUnit): number => {
    const lat1 = unit.latitude;
    const lon1 = unit.longitude;
    const lat2 = incident.latitude;
    const lon2 = incident.longitude;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal
  };

  // Get unit suitability score for the incident
  const getUnitSuitability = (unit: RescueUnit): { score: number; reasons: string[] } => {
    let score = 0;
    const reasons: string[] = [];

    // Type matching
    switch (incident.incident_type) {
      case 'flood':
      case 'water_contamination':
        if (unit.unit_type === 'water_rescue') {
          score += 30;
          reasons.push('Specialized in water rescue');
        } else if (unit.unit_type === 'fire_rescue') {
          score += 20;
          reasons.push('Fire rescue trained for water emergencies');
        }
        break;
      case 'medical_emergency':
        if (unit.unit_type === 'medical') {
          score += 30;
          reasons.push('Medical emergency specialist');
        }
        break;
      case 'rescue_needed':
        if (unit.unit_type === 'search_rescue') {
          score += 30;
          reasons.push('Search and rescue specialist');
        }
        break;
      case 'evacuation_required':
        if (unit.unit_type === 'evacuation') {
          score += 30;
          reasons.push('Evacuation specialist');
        }
        break;
      default:
        if (unit.unit_type === 'emergency_services') {
          score += 15;
          reasons.push('General emergency response');
        }
    }

    // Distance factor
    const distance = calculateDistance(unit);
    if (distance < 5) {
      score += 20;
      reasons.push('Very close to incident');
    } else if (distance < 15) {
      score += 10;
      reasons.push('Close to incident');
    } else if (distance > 30) {
      score -= 10;
      reasons.push('Far from incident');
    }

    // Capacity factor
    if (incident.affected_people_count > 0) {
      if (unit.capacity >= incident.affected_people_count) {
        score += 15;
        reasons.push('Adequate capacity for affected people');
      } else if (unit.capacity < incident.affected_people_count / 2) {
        score -= 5;
        reasons.push('Limited capacity');
      }
    }

    // Team size factor
    if (unit.team_size >= 4) {
      score += 10;
      reasons.push('Large team available');
    } else if (unit.team_size < 2) {
      score -= 5;
      reasons.push('Small team size');
    }

    // Fuel level factor
    if (unit.fuel_level && unit.fuel_level < 25) {
      score -= 15;
      reasons.push('Low fuel level');
    } else if (unit.fuel_level && unit.fuel_level > 75) {
      score += 5;
      reasons.push('Good fuel level');
    }

    return { score: Math.max(0, score), reasons };
  };

  // Sort units by suitability
  const sortedUnits = useMemo(() => {
    return availableUnits
      .map(unit => ({
        ...unit,
        distance: calculateDistance(unit),
        suitability: getUnitSuitability(unit)
      }))
      .sort((a, b) => b.suitability.score - a.suitability.score);
  }, [availableUnits, incident]);

  const handleAssignUnit = async () => {
    if (!selectedUnit) {
      toast.error('Please select a unit to assign');
      return;
    }

    try {
      const assignmentData: AssignmentRequest = {
        incident_id: incident.id,
        unit_id: selectedUnit.id,
        priority: incident.severity,
        estimated_arrival: estimatedArrival,
        notes: notes.trim() || undefined,
      };

      console.log('Assigning unit:', assignmentData);

      // Use the mutation hook
      await assignUnitMutation.mutateAsync(assignmentData);
      
      if (onSuccess) {
        onSuccess(selectedUnit);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Assignment failed:', error);
      
      if (error.message.includes('no longer available')) {
        toast.error('Unit is no longer available');
      } else if (error.message.includes('Validation Error')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to assign unit. Please try again.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-blue-50">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mr-3">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Assign Rescue Unit</h2>
                <p className="text-sm text-gray-600">
                  Assign a rescue unit to incident: {incident.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex h-[calc(90vh-200px)]">
            {/* Left side - Unit list */}
            <div className="flex-1 p-6 overflow-y-auto border-r">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search units..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Available units count */}
              <div className="mb-4 text-sm text-gray-600">
                {sortedUnits.length} available unit{sortedUnits.length !== 1 ? 's' : ''} found
              </div>

              {/* Units list */}
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading units...</p>
                  </div>
                ) : sortedUnits.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No available units found</p>
                  </div>
                ) : (
                  sortedUnits.map((unit) => (
                    <motion.div
                      key={unit.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedUnit?.id === unit.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedUnit(unit)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <span className="text-2xl">{getUnitTypeIcon(unit.unit_type)}</span>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {unit.unit_name}
                              </h4>
                              {unit.call_sign && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                  {unit.call_sign}
                                </span>
                              )}
                            </div>
                            
                            <div className="text-xs text-gray-600 mb-2">
                              {unit.unit_type.replace('_', ' ')} • {unit.team_size} members
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                              <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                <span>{unit.distance} km away</span>
                              </div>
                              <div className="flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                <span>Capacity: {unit.capacity}</span>
                              </div>
                            </div>

                            {/* Suitability reasons */}
                            {unit.suitability.reasons.length > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center mb-1">
                                  <div className={`text-xs font-medium px-2 py-0.5 rounded ${
                                    unit.suitability.score >= 50 ? 'bg-green-100 text-green-800' :
                                    unit.suitability.score >= 30 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {unit.suitability.score >= 50 ? 'Highly Suitable' :
                                     unit.suitability.score >= 30 ? 'Suitable' : 'Available'}
                                  </div>
                                </div>
                                <ul className="text-xs text-gray-600 space-y-0.5">
                                  {unit.suitability.reasons.slice(0, 2).map((reason, idx) => (
                                    <li key={idx} className="flex items-center">
                                      <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedUnit?.id === unit.id && (
                          <div className="ml-2">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Right side - Assignment details */}
            <div className="w-80 p-6 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Details</h3>
              
              {/* Incident info */}
              <div className="mb-6 p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">Incident Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Type:</span>
                    <span className="ml-2">{incident.incident_type.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="font-medium">Severity:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                      incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {incident.severity}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">People Affected:</span>
                    <span className="ml-2">{incident.affected_people_count}</span>
                  </div>
                  <div>
                    <span className="font-medium">Reported:</span>
                    <span className="ml-2">{format(new Date(incident.created_at), 'MMM d, HH:mm')}</span>
                  </div>
                </div>
              </div>

              {/* Selected unit info */}
              {selectedUnit && (
                <div className="mb-6 p-4 bg-white rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-2">Selected Unit</h4>
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">{selectedUnit.unit_name}</div>
                    <div>{selectedUnit.unit_type.replace('_', ' ')}</div>
                    <div>{selectedUnit.distance} km away</div>
                    {selectedUnit.team_leader && (
                      <div>Leader: {selectedUnit.team_leader}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Assignment options */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Arrival (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={estimatedArrival}
                    onChange={(e) => setEstimatedArrival(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Notes (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions or notes..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              {selectedUnit ? (
                <span>
                  Ready to assign <strong>{selectedUnit.unit_name}</strong> to this incident
                </span>
              ) : (
                <span>Select a unit to proceed with assignment</span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignUnit}
                disabled={!selectedUnit || assignUnitMutation.isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assignUnitMutation.isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning...
                  </div>
                ) : (
                  'Assign Unit'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
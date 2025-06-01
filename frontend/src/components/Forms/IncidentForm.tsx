import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Send, Loader2, Navigation, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useCreateIncident } from '../../hooks/useIncidents';
import { CreateIncidentData, IncidentType, SeverityLevel } from '../../types';

interface SimpleIncidentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (incident: any) => void;
  initialLocation?: { lat: number; lng: number };
}

interface FormData {
  title: string;
  description: string;
  incident_type: IncidentType;
  severity: SeverityLevel;
  affected_people_count: number;
  water_level?: number;
  latitude: number;
  longitude: number;
  address: string;
  landmark: string;
}

const INCIDENT_TYPES = [
  { value: 'flood', label: 'Flood', icon: '🌊' },
  { value: 'rescue_needed', label: 'Rescue Needed', icon: '🆘' },
  { value: 'infrastructure_damage', label: 'Infrastructure Damage', icon: '🏗️' },
  { value: 'road_closure', label: 'Road Closure', icon: '🚧' },
  { value: 'power_outage', label: 'Power Outage', icon: '⚡' },
  { value: 'water_contamination', label: 'Water Contamination', icon: '💧' },
  { value: 'evacuation_required', label: 'Evacuation Required', icon: '🚨' },
  { value: 'medical_emergency', label: 'Medical Emergency', icon: '🏥' },
  { value: 'other', label: 'Other', icon: '❗' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'text-green-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
];

export default function SimpleIncidentForm({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialLocation 
}: SimpleIncidentFormProps) {
  const { user } = useAuth();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const createIncidentMutation = useCreateIncident();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>({
    defaultValues: {
      title: '',
      description: '',
      incident_type: 'flood',
      severity: 'medium',
      affected_people_count: 1,
      water_level: undefined,
      latitude: initialLocation?.lat || 0,
      longitude: initialLocation?.lng || 0,
      address: '',
      landmark: '',
    },
  });

  const watchedLat = watch('latitude');
  const watchedLng = watch('longitude');
  const watchedType = watch('incident_type');
  const watchedSeverity = watch('severity');

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        setValue('latitude', latitude);
        setValue('longitude', longitude);
        
        // Try to get address from coordinates (reverse geocoding)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          
          if (data.display_name) {
            setValue('address', data.display_name);
          }
        } catch (error) {
          console.warn('Failed to get address from coordinates:', error);
        }
        
        setIsGettingLocation(false);
        toast.success('Location detected successfully');
      },
      (error) => {
        setIsGettingLocation(false);
        console.error('Geolocation error:', error);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location access denied. Please enable location permissions.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('Failed to get current location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const onSubmit = async (data: FormData) => {
    try {
      console.log('🚨 Form submitted with data:', data);

      if (!data.latitude || !data.longitude) {
        toast.error('Please provide location coordinates');
        return;
      }

      // Prepare incident data according to API schema
      const incidentData: CreateIncidentData = {
        title: data.title,
        description: data.description || undefined,
        incident_type: data.incident_type,
        severity: data.severity,
        affected_people_count: data.affected_people_count,
        water_level: data.water_level || undefined,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address || undefined,
          landmark: data.landmark || undefined,
        },
      };

      console.log('📤 Sending incident data to API:', incidentData);
      
      const result = await createIncidentMutation.mutateAsync(incidentData);
      
      console.log('✅ Incident created successfully:', result);
      toast.success('Emergency incident reported successfully!');
      
      // Reset form and close
      reset();
      onClose();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
    } catch (error: any) {
      console.error('❌ Failed to create incident:', error);
      
      // More specific error handling
      if (error.response?.status === 422) {
        const validationErrors = error.response.data?.detail;
        if (validationErrors && Array.isArray(validationErrors)) {
          const errorMessages = validationErrors.map((err: any) => 
            `${err.loc?.join('.')}: ${err.msg}`
          ).join(', ');
          toast.error(`Validation Error: ${errorMessages}`);
        } else {
          toast.error('Invalid data provided. Please check all fields.');
        }
      } else if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error('Failed to report incident. Please try again.');
      }
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-red-50">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full mr-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Report Emergency</h2>
                <p className="text-sm text-gray-600">Emergency Incident Report</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Incident Title *
                </label>
                <input
                  {...register('title', { 
                    required: 'Title is required',
                    minLength: { value: 5, message: 'Title must be at least 5 characters' }
                  })}
                  type="text"
                  placeholder="Brief description of the emergency"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              {/* Type and Severity Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Incident Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Incident Type *
                  </label>
                  <select
                    {...register('incident_type', { required: 'Type is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {INCIDENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity *
                  </label>
                  <select
                    {...register('severity', { required: 'Severity is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {SEVERITY_LEVELS.map((severity) => (
                      <option key={severity.value} value={severity.value}>
                        {severity.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Detailed description of the incident..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* People Affected and Water Level */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    People Affected *
                  </label>
                  <input
                    {...register('affected_people_count', { 
                      required: 'Number of people is required',
                      min: { value: 0, message: 'Cannot be negative' },
                      valueAsNumber: true,
                    })}
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.affected_people_count && (
                    <p className="mt-1 text-sm text-red-600">{errors.affected_people_count.message}</p>
                  )}
                </div>

                {/* Water Level (conditional) */}
                {(watchedType === 'flood' || watchedType === 'water_contamination') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Water Level (meters)
                    </label>
                    <input
                      {...register('water_level', {
                        min: { value: 0, message: 'Cannot be negative' },
                        valueAsNumber: true,
                      })}
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0.0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    {errors.water_level && (
                      <p className="mt-1 text-sm text-red-600">{errors.water_level.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Location Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Location *
                  </label>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 mr-1" />
                        Use Current Location
                      </>
                    )}
                  </button>
                </div>
                
                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    {...register('latitude', { 
                      required: 'Latitude is required',
                      min: { value: -90, message: 'Invalid latitude' },
                      max: { value: 90, message: 'Invalid latitude' },
                      valueAsNumber: true,
                    })}
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <input
                    {...register('longitude', { 
                      required: 'Longitude is required',
                      min: { value: -180, message: 'Invalid longitude' },
                      max: { value: 180, message: 'Invalid longitude' },
                      valueAsNumber: true,
                    })}
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                
                {/* Address */}
                <input
                  {...register('address')}
                  type="text"
                  placeholder="Street address or area description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-2"
                />
                
                {/* Landmark */}
                <input
                  {...register('landmark')}
                  type="text"
                  placeholder="Nearby landmark or reference point"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                
                {(errors.latitude || errors.longitude) && (
                  <p className="mt-1 text-sm text-red-600">Location coordinates are required</p>
                )}
                
                {/* Location Preview */}
                {watchedLat && watchedLng && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <div className="flex items-center text-green-800">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>Location: {watchedLat.toFixed(6)}, {watchedLng.toFixed(6)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={createIncidentMutation.isLoading || !isValid}
                  className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createIncidentMutation.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Reporting Emergency...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Report Emergency Incident
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* User Info */}
            <div className="mt-4 pt-4 border-t text-sm text-gray-500">
              <div className="flex items-center justify-between">
                <span>Reporting as: {user?.full_name}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
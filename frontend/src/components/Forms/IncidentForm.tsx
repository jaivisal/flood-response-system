import React, { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  X,
  MapPin,
  Camera,
  Upload,
  Users,
  Droplets,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle,
  Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { useCreateIncident } from '../../hooks/useIncidents';
import { CreateIncidentData, IncidentType, SeverityLevel, LocationData } from '../../types';

interface IncidentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (incident: any) => void;
  initialLocation?: { lat: number; lng: number };
}

interface IncidentFormData {
  title: string;
  description: string;
  incident_type: IncidentType;
  severity: SeverityLevel;
  affected_people_count: number;
  water_level?: number;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    landmark: string;
  };
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
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800 border-red-200' },
];

export default function IncidentForm({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialLocation 
}: IncidentFormProps) {
  const { user } = useAuth();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const createIncidentMutation = useCreateIncident();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<IncidentFormData>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      incident_type: 'flood',
      severity: 'medium',
      affected_people_count: 1,
      water_level: undefined,
      location: {
        latitude: initialLocation?.lat || 0,
        longitude: initialLocation?.lng || 0,
        address: '',
        landmark: '',
      },
    },
  });

  // Watch form values
  const watchedSeverity = watch('severity');
  const watchedType = watch('incident_type');
  const watchedLocation = watch('location');

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        setValue('location.latitude', latitude);
        setValue('location.longitude', longitude);
        
        // Try to get address from coordinates (reverse geocoding)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          
          if (data.display_name) {
            setValue('location.address', data.display_name);
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
  }, [setValue]);

  // Handle image upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file.`);
        return false;
      }
      return true;
    });

    setUploadedImages(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    multiple: true,
    maxFiles: 5,
  });

  // Remove uploaded image
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Form submission
  const onSubmit = async (data: IncidentFormData) => {
    try {
      if (!data.location.latitude || !data.location.longitude) {
        toast.error('Please provide location coordinates');
        return;
      }

      // Prepare incident data
      const incidentData: CreateIncidentData = {
        title: data.title,
        description: data.description,
        incident_type: data.incident_type,
        severity: data.severity,
        affected_people_count: data.affected_people_count,
        water_level: data.water_level,
        location: {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          address: data.location.address,
          landmark: data.location.landmark,
        },
      };

      // TODO: Handle image uploads here
      // For now, we'll just log the images
      if (uploadedImages.length > 0) {
        console.log('Images to upload:', uploadedImages);
        // In a real implementation, you would upload images to a storage service
        // and add the URLs to incidentData.additional_images
      }

      await createIncidentMutation.mutateAsync(incidentData);
      
      toast.success('Incident reported successfully!');
      
      if (onSuccess) {
        // onSuccess(response);
      }
      
      handleClose();
    } catch (error) {
      console.error('Failed to create incident:', error);
      // Error is handled by the mutation
    }
  };

  // Close modal and reset form
  const handleClose = () => {
    reset();
    setUploadedImages([]);
    setStep(1);
    onClose();
  };

  // Navigate steps
  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Validate current step
  const isStepValid = () => {
    switch (step) {
      case 1:
        return !!watch('title') && !!watch('incident_type') && !!watch('severity');
      case 2:
        return !!watchedLocation.latitude && !!watchedLocation.longitude;
      case 3:
        return true; // Optional step
      default:
        return false;
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
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-red-50">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full mr-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Report Emergency Incident</h2>
                <p className="text-sm text-gray-600">Step {step} of {totalSteps}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-3 bg-gray-50">
            <div className="flex justify-between mb-2">
              {[1, 2, 3].map((stepNumber) => (
                <div
                  key={stepNumber}
                  className={`flex items-center ${
                    stepNumber < 3 ? 'flex-1' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= stepNumber
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step > stepNumber ? <CheckCircle className="w-4 h-4" /> : stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div
                      className={`flex-1 h-2 mx-2 rounded ${
                        step > stepNumber ? 'bg-red-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Details</span>
              <span>Location</span>
              <span>Media</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Step 1: Basic Details */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Incident Title *
                    </label>
                    <input
                      {...register('title', {
                        required: 'Title is required',
                        minLength: { value: 5, message: 'Title must be at least 5 characters' },
                        maxLength: { value: 200, message: 'Title must be less than 200 characters' },
                      })}
                      type="text"
                      placeholder="Brief description of the incident"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                    )}
                  </div>

                  {/* Incident Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Incident Type *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {INCIDENT_TYPES.map((type) => (
                        <label
                          key={type.value}
                          className={`relative flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                            watchedType === type.value
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <input
                            {...register('incident_type', { required: 'Please select incident type' })}
                            type="radio"
                            value={type.value}
                            className="sr-only"
                          />
                          <span className="text-lg mr-2">{type.icon}</span>
                          <span className="text-sm font-medium text-gray-900">{type.label}</span>
                          {watchedType === type.value && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="w-4 h-4 text-red-600" />
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                    {errors.incident_type && (
                      <p className="mt-1 text-sm text-red-600">{errors.incident_type.message}</p>
                    )}
                  </div>

                  {/* Severity Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Severity Level *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {SEVERITY_LEVELS.map((severity) => (
                        <label
                          key={severity.value}
                          className={`relative flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            watchedSeverity === severity.value
                              ? severity.color
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            {...register('severity', { required: 'Please select severity level' })}
                            type="radio"
                            value={severity.value}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium">{severity.label}</span>
                          {watchedSeverity === severity.value && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                    {errors.severity && (
                      <p className="mt-1 text-sm text-red-600">{errors.severity.message}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      {...register('description')}
                      rows={4}
                      placeholder="Detailed description of the incident..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  {/* Affected People Count */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Users className="w-4 h-4 inline mr-1" />
                        People Affected
                      </label>
                      <input
                        {...register('affected_people_count', {
                          required: 'Please specify number of people affected',
                          min: { value: 0, message: 'Cannot be negative' },
                          max: { value: 10000, message: 'Please contact emergency services for large-scale incidents' },
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
                          <Droplets className="w-4 h-4 inline mr-1" />
                          Water Level (meters)
                        </label>
                        <input
                          {...register('water_level', {
                            min: { value: 0, message: 'Cannot be negative' },
                            max: { value: 50, message: 'Please verify this measurement' },
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
                </motion.div>
              )}

              {/* Step 2: Location */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Get Current Location Button */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGettingLocation ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Navigation className="w-4 h-4 mr-2" />
                      )}
                      {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
                    </button>
                  </div>

                  {/* Coordinates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Latitude *
                      </label>
                      <input
                        {...register('location.latitude', {
                          required: 'Latitude is required',
                          min: { value: -90, message: 'Invalid latitude' },
                          max: { value: 90, message: 'Invalid latitude' },
                        })}
                        type="number"
                        step="any"
                        placeholder="9.9252"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      {errors.location?.latitude && (
                        <p className="mt-1 text-sm text-red-600">{errors.location.latitude.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Longitude *
                      </label>
                      <input
                        {...register('location.longitude', {
                          required: 'Longitude is required',
                          min: { value: -180, message: 'Invalid longitude' },
                          max: { value: 180, message: 'Invalid longitude' },
                        })}
                        type="number"
                        step="any"
                        placeholder="78.1198"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      {errors.location?.longitude && (
                        <p className="mt-1 text-sm text-red-600">{errors.location.longitude.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Address
                    </label>
                    <input
                      {...register('location.address')}
                      type="text"
                      placeholder="Street address or area description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  {/* Landmark */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nearby Landmark
                    </label>
                    <input
                      {...register('location.landmark')}
                      type="text"
                      placeholder="Nearby landmark or reference point"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  {/* Location Preview */}
                  {watchedLocation.latitude && watchedLocation.longitude && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center text-green-800">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Location confirmed</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        {watchedLocation.latitude.toFixed(6)}, {watchedLocation.longitude.toFixed(6)}
                      </p>
                      {watchedLocation.address && (
                        <p className="text-sm text-green-700 mt-1">{watchedLocation.address}</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Media Upload */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Camera className="w-4 h-4 inline mr-1" />
                      Upload Images (Optional)
                    </label>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload photos of the incident to help responders assess the situation. Max 5 images, 10MB each.
                    </p>

                    {/* Dropzone */}
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        isDragActive
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      {isDragActive ? (
                        <p className="text-red-600">Drop the images here...</p>
                      ) : (
                        <div>
                          <p className="text-gray-600">Drag & drop images here, or click to select</p>
                          <p className="text-sm text-gray-400 mt-1">JPG, PNG, GIF up to 10MB</p>
                        </div>
                      )}
                    </div>

                    {/* Uploaded Images Preview */}
                    {uploadedImages.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Uploaded Images ({uploadedImages.length}/5)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {uploadedImages.map((file, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-1 left-1 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded">
                                {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {user ? `Reporting as: ${user.full_name}` : 'Not logged in'}
            </div>

            <div className="flex space-x-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
              )}

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStepValid()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={createIncidentMutation.isLoading || !isValid}
                  className="inline-flex items-center px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createIncidentMutation.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Reporting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Report Incident
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

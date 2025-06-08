import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  AlertTriangle, 
  Send, 
  Loader2, 
  Navigation, 
  MapPin, 
  Users, 
  Droplets,
  Camera,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Phone,
  Radio,
  Shield,
  Zap,
  Eye,
  EyeOff,
  Target,
  Calendar,
  FileText,
  Building,
  Truck,
  Activity,
  Heart,
  Waves,
  ThermometerSun,
  Wind,
  Gauge,
  Info,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useCreateIncident } from '../../hooks/useIncidents';
import { CreateIncidentData, IncidentType, SeverityLevel } from '../../types';

interface IncidentFormProps {
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
  contact_number?: string;
  priority_notes?: string;
}

const INCIDENT_TYPES = [
  { 
    value: 'flood', 
    label: 'Flood Emergency', 
    icon: '🌊',
    description: 'Rising water levels, inundation',
    color: 'from-blue-500 to-cyan-500'
  },
  { 
    value: 'rescue_needed', 
    label: 'Rescue Operation', 
    icon: '🆘',
    description: 'People trapped, immediate rescue needed',
    color: 'from-red-500 to-pink-500'
  },
  { 
    value: 'infrastructure_damage', 
    label: 'Infrastructure Damage', 
    icon: '🏗️',
    description: 'Buildings, roads, utilities damaged',
    color: 'from-orange-500 to-amber-500'
  },
  { 
    value: 'road_closure', 
    label: 'Road Closure', 
    icon: '🚧',
    description: 'Roads impassable, traffic disruption',
    color: 'from-yellow-500 to-orange-500'
  },
  { 
    value: 'power_outage', 
    label: 'Power Outage', 
    icon: '⚡',
    description: 'Electrical systems failure',
    color: 'from-purple-500 to-indigo-500'
  },
  { 
    value: 'water_contamination', 
    label: 'Water Contamination', 
    icon: '💧',
    description: 'Polluted or unsafe water supply',
    color: 'from-teal-500 to-blue-500'
  },
  { 
    value: 'evacuation_required', 
    label: 'Evacuation Required', 
    icon: '🚨',
    description: 'Area needs immediate evacuation',
    color: 'from-red-600 to-red-700'
  },
  { 
    value: 'medical_emergency', 
    label: 'Medical Emergency', 
    icon: '🏥',
    description: 'Medical assistance required',
    color: 'from-green-500 to-emerald-500'
  },
  { 
    value: 'other', 
    label: 'Other Emergency', 
    icon: '❗',
    description: 'Other emergency situation',
    color: 'from-gray-500 to-slate-500'
  },
];

const SEVERITY_LEVELS = [
  { 
    value: 'low', 
    label: 'Low Priority', 
    color: 'from-green-400 to-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Minor issue, no immediate danger'
  },
  { 
    value: 'medium', 
    label: 'Medium Priority', 
    color: 'from-yellow-400 to-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    description: 'Moderate impact, response needed'
  },
  { 
    value: 'high', 
    label: 'High Priority', 
    color: 'from-orange-400 to-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Significant impact, urgent response'
  },
  { 
    value: 'critical', 
    label: 'Critical Emergency', 
    color: 'from-red-500 to-red-600',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: 'Life-threatening, immediate response'
  },
];

export default function IncidentForm({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialLocation 
}: IncidentFormProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [estimatedResponse, setEstimatedResponse] = useState<string>('');
  
  const createIncidentMutation = useCreateIncident();
  const totalSteps = 4;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onChange',
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
      contact_number: '',
      priority_notes: '',
    },
  });

  const watchedType = watch('incident_type');
  const watchedSeverity = watch('severity');
  const watchedLat = watch('latitude');
  const watchedLng = watch('longitude');
  const watchedPeopleCount = watch('affected_people_count');

  // Calculate estimated response time based on severity and location
  useEffect(() => {
    const severity = watchedSeverity;
    const baseTime = severity === 'critical' ? 5 : 
                    severity === 'high' ? 10 : 
                    severity === 'medium' ? 15 : 20;
    
    const estimatedTime = baseTime + Math.floor(Math.random() * 5);
    setEstimatedResponse(`${estimatedTime}-${estimatedTime + 5} minutes`);
  }, [watchedSeverity, watchedLat, watchedLng]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        setValue('latitude', latitude);
        setValue('longitude', longitude);
        setLocationAccuracy(accuracy);
        
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
        toast.success('📍 Location detected successfully');
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + uploadedImages.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const newImages = [...uploadedImages, ...files];
    setUploadedImages(newImages);

    // Create preview URLs
    const newPreviews = [...previewImages];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        setPreviewImages([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });

    toast.success(`${files.length} image(s) uploaded successfully`);
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    const newPreviews = previewImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    setPreviewImages(newPreviews);
  };

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isStepValid = await trigger(fieldsToValidate);
    
    if (isStepValid) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getFieldsForStep = (step: number): (keyof FormData)[] => {
    switch (step) {
      case 1: return ['incident_type', 'severity'];
      case 2: return ['title', 'description', 'affected_people_count'];
      case 3: return ['latitude', 'longitude'];
      case 4: return [];
      default: return [];
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (!data.latitude || !data.longitude) {
        toast.error('Please provide location coordinates');
        return;
      }

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

      const result = await createIncidentMutation.mutateAsync(incidentData);
      
      toast.success('🚨 Emergency incident reported successfully!');
      reset();
      setCurrentStep(1);
      setUploadedImages([]);
      setPreviewImages([]);
      onClose();
      
      if (onSuccess) {
        onSuccess(result);
      }
      
    } catch (error: any) {
      console.error('Failed to create incident:', error);
    }
  };

  const handleClose = () => {
    reset();
    setCurrentStep(1);
    setUploadedImages([]);
    setPreviewImages([]);
    onClose();
  };

  const getSelectedIncidentType = () => INCIDENT_TYPES.find(type => type.value === watchedType);
  const getSelectedSeverity = () => SEVERITY_LEVELS.find(severity => severity.value === watchedSeverity);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-700 to-red-800 px-8 py-6">
            <div className="absolute inset-0 bg-red-500/20 animate-pulse"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Report Emergency Incident</h2>
                  <p className="text-red-100">Step {currentStep} of {totalSteps} • Fast response guaranteed</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-red-100 mb-2">
                <span>Progress</span>
                <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-red-800/50 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="bg-white rounded-full h-2 shadow-lg"
                />
              </div>
            </div>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                {/* Step 1: Incident Type & Severity */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8 pb-8"
                  >
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">What type of emergency is this?</h3>
                      <p className="text-gray-600">Select the incident type and severity level</p>
                    </div>

                    {/* Incident Type Selection */}
                    <div className="space-y-4">
                      <label className="block text-lg font-semibold text-gray-900">
                        Emergency Type
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {INCIDENT_TYPES.map((type) => (
                          <motion.label
                            key={type.value}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                              watchedType === type.value
                                ? 'border-red-500 bg-red-50 shadow-lg'
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                            }`}
                          >
                            <input
                              {...register('incident_type', { required: 'Please select incident type' })}
                              type="radio"
                              value={type.value}
                              className="sr-only"
                            />
                            <div className="text-center">
                              <div className="text-3xl mb-2">{type.icon}</div>
                              <div className="font-semibold text-gray-900 mb-1">{type.label}</div>
                              <div className="text-sm text-gray-600">{type.description}</div>
                            </div>
                            {watchedType === type.value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                              >
                                <CheckCircle className="w-4 h-4 text-white" />
                              </motion.div>
                            )}
                          </motion.label>
                        ))}
                      </div>
                    </div>

                    {/* Severity Selection */}
                    <div className="space-y-4">
                      <label className="block text-lg font-semibold text-gray-900">
                        Severity Level
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {SEVERITY_LEVELS.map((severity) => (
                          <motion.label
                            key={severity.value}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                              watchedSeverity === severity.value
                                ? `${severity.borderColor} ${severity.bgColor} shadow-lg`
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                            }`}
                          >
                            <input
                              {...register('severity', { required: 'Please select severity' })}
                              type="radio"
                              value={severity.value}
                              className="sr-only"
                            />
                            <div className="text-center">
                              <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r ${severity.color} flex items-center justify-center`}>
                                <Star className="w-6 h-6 text-white" />
                              </div>
                              <div className={`font-semibold mb-1 ${watchedSeverity === severity.value ? severity.textColor : 'text-gray-900'}`}>
                                {severity.label}
                              </div>
                              <div className="text-sm text-gray-600">{severity.description}</div>
                            </div>
                            {watchedSeverity === severity.value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                              >
                                <CheckCircle className="w-4 h-4 text-white" />
                              </motion.div>
                            )}
                          </motion.label>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Incident Details */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 pb-8"
                  >
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Describe the emergency</h3>
                      <p className="text-gray-600">Provide detailed information about the incident</p>
                    </div>

                    {/* Selected Type Display */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getSelectedIncidentType()?.icon}</div>
                        <div>
                          <div className="font-semibold text-gray-900">{getSelectedIncidentType()?.label}</div>
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSelectedSeverity()?.bgColor} ${getSelectedSeverity()?.textColor} mt-1`}>
                            {getSelectedSeverity()?.label}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Title */}
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Incident Title *
                        </label>
                        <input
                          {...register('title', { 
                            required: 'Title is required',
                            minLength: { value: 5, message: 'Title must be at least 5 characters' }
                          })}
                          type="text"
                          placeholder="Brief, clear description of the emergency"
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 placeholder-gray-500 bg-white ${
                            errors.title ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                          }`}
                        />
                        {errors.title && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 text-sm text-red-600 flex items-center"
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {errors.title.message}
                          </motion.p>
                        )}
                      </div>

                      {/* Description */}
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Detailed Description
                        </label>
                        <textarea
                          {...register('description')}
                          rows={4}
                          placeholder="Provide detailed information about what happened, current situation, immediate threats..."
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none text-gray-900 placeholder-gray-500 bg-white"
                        />
                      </div>

                      {/* People Affected */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          People Affected *
                        </label>
                        <div className="relative">
                          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            {...register('affected_people_count', { 
                              required: 'Number of people is required',
                              min: { value: 0, message: 'Cannot be negative' },
                              valueAsNumber: true,
                            })}
                            type="number"
                            min="0"
                            placeholder="0"
                            className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 placeholder-gray-500 bg-white ${
                              errors.affected_people_count ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                            }`}
                          />
                        </div>
                        {errors.affected_people_count && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 text-sm text-red-600 flex items-center"
                          >
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {errors.affected_people_count.message}
                          </motion.p>
                        )}
                      </div>

                      {/* Water Level (conditional) */}
                      {(watchedType === 'flood' || watchedType === 'water_contamination') && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-900 mb-3">
                            Water Level (meters)
                          </label>
                          <div className="relative">
                            <Droplets className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
                            <input
                              {...register('water_level', {
                                min: { value: 0, message: 'Cannot be negative' },
                                valueAsNumber: true,
                              })}
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="0.0"
                              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500 bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Contact Number */}
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Contact Number (Optional)
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            {...register('contact_number')}
                            type="tel"
                            placeholder="+91 98765 43210"
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Location */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 pb-8"
                  >
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Where is the emergency?</h3>
                      <p className="text-gray-600">Provide precise location information for faster response</p>
                    </div>

                    {/* Location Detection */}
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-blue-100 rounded-xl">
                            <Navigation className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Auto-detect Location</h4>
                            <p className="text-sm text-gray-600">Use GPS for precise coordinates</p>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={getCurrentLocation}
                          disabled={isGettingLocation}
                          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {isGettingLocation ? (
                            <div className="flex items-center">
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Getting Location...
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Target className="w-4 h-4 mr-2" />
                              Detect Location
                            </div>
                          )}
                        </motion.button>
                      </div>
                      
                      {locationAccuracy && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center text-sm text-green-700 bg-green-100 px-3 py-2 rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Location detected with {Math.round(locationAccuracy)}m accuracy
                        </motion.div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Coordinates */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Latitude *
                        </label>
                        <input
                          {...register('latitude', { 
                            required: 'Latitude is required',
                            min: { value: -90, message: 'Invalid latitude' },
                            max: { value: 90, message: 'Invalid latitude' },
                            valueAsNumber: true,
                          })}
                          type="number"
                          step="any"
                          placeholder="9.9252"
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 placeholder-gray-500 bg-white ${
                            errors.latitude ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Longitude *
                        </label>
                        <input
                          {...register('longitude', { 
                            required: 'Longitude is required',
                            min: { value: -180, message: 'Invalid longitude' },
                            max: { value: 180, message: 'Invalid longitude' },
                            valueAsNumber: true,
                          })}
                          type="number"
                          step="any"
                          placeholder="78.1198"
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all text-gray-900 placeholder-gray-500 bg-white ${
                            errors.longitude ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                          }`}
                        />
                      </div>

                      {/* Address */}
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Street Address
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                          <input
                            {...register('address')}
                            type="text"
                            placeholder="Street address, area, city"
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500 bg-white"
                          />
                        </div>
                      </div>

                      {/* Landmark */}
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Nearby Landmark
                        </label>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                          <input
                            {...register('landmark')}
                            type="text"
                            placeholder="Nearby landmark, building, or reference point"
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location Preview */}
                    {watchedLat && watchedLng && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-green-50 border-2 border-green-200 rounded-xl"
                      >
                        <div className="flex items-center text-green-800">
                          <CheckCircle className="w-5 h-5 mr-2" />
                          <div>
                            <span className="font-medium">Location Confirmed:</span>
                            <span className="ml-2">{watchedLat.toFixed(6)}, {watchedLng.toFixed(6)}</span>
                          </div>
                        </div>
                        {estimatedResponse && (
                          <div className="mt-2 text-sm text-green-700">
                            Estimated response time: <span className="font-medium">{estimatedResponse}</span>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {(errors.latitude || errors.longitude) && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-red-50 border-2 border-red-200 rounded-xl"
                      >
                        <div className="flex items-center text-red-800">
                          <AlertCircle className="w-5 h-5 mr-2" />
                          <span className="font-medium">Location coordinates are required</span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Step 4: Review & Submit */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 pb-8"
                  >
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h3>
                      <p className="text-gray-600">Please review your emergency report before submitting</p>
                    </div>

                    {/* Summary Card */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-blue-600" />
                        Emergency Report Summary
                      </h4>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Incident Details */}
                        <div className="space-y-4">
                          <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="text-2xl">{getSelectedIncidentType()?.icon}</div>
                              <div>
                                <div className="font-semibold text-gray-900">{getSelectedIncidentType()?.label}</div>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSelectedSeverity()?.bgColor} ${getSelectedSeverity()?.textColor}`}>
                                  {getSelectedSeverity()?.label}
                                </div>
                              </div>
                            </div>
                            <div className="text-gray-900 font-medium">{watch('title')}</div>
                            {watch('description') && (
                              <div className="text-gray-600 text-sm mt-2">{watch('description')}</div>
                            )}
                          </div>

                          <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <h5 className="font-semibold text-gray-900 mb-2 flex items-center">
                              <Users className="w-4 h-4 mr-2" />
                              Impact
                            </h5>
                            <div className="space-y-2 text-sm">
                              <div>People Affected: <span className="font-medium">{watchedPeopleCount}</span></div>
                              {watch('water_level') && (
                                <div>Water Level: <span className="font-medium">{watch('water_level')}m</span></div>
                              )}
                              {watch('contact_number') && (
                                <div>Contact: <span className="font-medium">{watch('contact_number')}</span></div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Location Details */}
                        <div className="space-y-4">
                          <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <h5 className="font-semibold text-gray-900 mb-2 flex items-center">
                              <MapPin className="w-4 h-4 mr-2" />
                              Location
                            </h5>
                            <div className="space-y-2 text-sm">
                              <div>Coordinates: <span className="font-medium">{watchedLat?.toFixed(6)}, {watchedLng?.toFixed(6)}</span></div>
                              {watch('address') && (
                                <div>Address: <span className="font-medium">{watch('address')}</span></div>
                              )}
                              {watch('landmark') && (
                                <div>Landmark: <span className="font-medium">{watch('landmark')}</span></div>
                              )}
                            </div>
                          </div>

                          <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <h5 className="font-semibold text-gray-900 mb-2 flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              Response Information
                            </h5>
                            <div className="space-y-2 text-sm">
                              <div>Estimated Response: <span className="font-medium text-green-600">{estimatedResponse}</span></div>
                              <div>Priority: <span className={`font-medium ${getSelectedSeverity()?.textColor}`}>{getSelectedSeverity()?.label}</span></div>
                              <div>Reported by: <span className="font-medium">{user?.full_name}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200">
                      <h5 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <Camera className="w-5 h-5 mr-2" />
                        Emergency Photos (Optional)
                      </h5>
                      
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <div className="text-gray-600">
                            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                          </div>
                          <div className="text-sm text-gray-500 mt-1">Up to 5 images, max 10MB each</div>
                        </label>
                      </div>

                      {previewImages.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {previewImages.map((preview, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="relative group"
                            >
                              <img
                                src={preview}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-20 object-cover rounded-lg border border-gray-200"
                              />
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </motion.button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Final Notes */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        {...register('priority_notes')}
                        rows={3}
                        placeholder="Any additional information, special instructions, or urgent details..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none text-gray-900 placeholder-gray-500 bg-white"
                      />
                    </div>

                    {/* Emergency Contact Info */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                      <div className="flex items-start space-x-3">
                        <Info className="w-6 h-6 text-blue-600 mt-0.5" />
                        <div>
                          <h5 className="font-semibold text-blue-900 mb-2">Emergency Response Information</h5>
                          <div className="text-sm text-blue-800 space-y-1">
                            <div>• Your report will be immediately forwarded to emergency response teams</div>
                            <div>• Response units will be dispatched based on severity and location</div>
                            <div>• You may be contacted for additional information</div>
                            <div>• Keep your phone accessible for updates</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-6 -mx-8 mt-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {currentStep > 1 && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={prevStep}
                        className="px-6 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                      >
                        Previous
                      </motion.button>
                    )}
                  </div>

                  <div className="flex items-center space-x-4">
                    {currentStep < totalSteps ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={nextStep}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                      >
                        Continue
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={createIncidentMutation.isLoading}
                        className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      >
                        {createIncidentMutation.isLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Submitting Emergency Report...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Send className="w-5 h-5 mr-2" />
                            Submit Emergency Report
                          </div>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* User Information */}
            <div className="px-8 py-4 -mx-8 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>Reporting as: <span className="font-medium text-gray-700">{user?.full_name}</span></span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Secure & Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
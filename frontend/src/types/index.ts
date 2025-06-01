export type UserRole = 'field_responder' | 'command_center' | 'district_officer' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// Incident Types
export type IncidentType = 
  | 'flood'
  | 'rescue_needed'
  | 'infrastructure_damage'
  | 'road_closure'
  | 'power_outage'
  | 'water_contamination'
  | 'evacuation_required'
  | 'medical_emergency'
  | 'other';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
}

export interface Incident {
  id: number;
  title: string;
  description?: string;
  incident_type: IncidentType;
  severity: SeverityLevel;
  status: IncidentStatus;
  affected_people_count: number;
  water_level?: number;
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
  image_url?: string;
  additional_images?: string[];
  reporter_id: number;
  assigned_unit_id?: number;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  coordinates?: [number, number];
  is_critical: boolean;
  requires_immediate_attention: boolean;
  severity_color: string;
}

export interface CreateIncidentData {
  title: string;
  description?: string;
  incident_type: IncidentType;
  severity: SeverityLevel;
  affected_people_count: number;
  water_level?: number;
  location: LocationData;
  image_url?: string;
  additional_images?: string[];
}

// frontend/src/types/index.ts - UPDATED IncidentStats interface

// ... existing types ...

export interface IncidentStats {
    total_incidents: number;
    by_severity: Record<string, number>;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    critical_incidents: number;
    resolved_incidents: number;
    average_resolution_time: number | null; // Changed from optional to nullable
  }
  
  // ... rest of the types remain the same ...

// Rescue Unit Types
export type UnitType = 
  | 'fire_rescue'
  | 'medical'
  | 'water_rescue'
  | 'evacuation'
  | 'search_rescue'
  | 'police'
  | 'emergency_services'
  | 'volunteer';

export type UnitStatus = 
  | 'available'
  | 'busy'
  | 'en_route'
  | 'on_scene'
  | 'offline'
  | 'maintenance';

export interface RescueUnit {
  id: number;
  unit_name: string;
  call_sign?: string;
  unit_type: UnitType;
  status: UnitStatus;
  capacity: number;
  team_size: number;
  team_leader?: string;
  contact_number?: string;
  radio_frequency?: string;
  latitude: number;
  longitude: number;
  current_address?: string;
  fuel_level?: number;
  last_maintenance?: string;
  next_maintenance?: string;
  created_at: string;
  updated_at?: string;
  last_location_update: string;
  coordinates?: [number, number];
  is_available: boolean;
  is_active: boolean;
  needs_maintenance: boolean;
  status_color: string;
  type_icon: string;
}

export interface CreateRescueUnitData {
  unit_name: string;
  call_sign?: string;
  unit_type: UnitType;
  capacity: number;
  team_size: number;
  team_leader?: string;
  contact_number?: string;
  radio_frequency?: string;
  location: LocationData;
  base_location?: LocationData;
  equipment?: string[];
}

export interface RescueUnitStats {
  total_units: number;
  available_units: number;
  busy_units: number;
  offline_units: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  average_response_time?: number;
  units_needing_maintenance: number;
}

// Flood Zone Types
export type RiskLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high' | 'extreme';
export type ZoneType = 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'natural' | 'mixed';

export interface FloodZone {
  id: number;
  name: string;
  description?: string;
  zone_code: string;
  risk_level: RiskLevel;
  zone_type: ZoneType;
  population_estimate: number;
  area_sqkm?: number;
  residential_units: number;
  commercial_units: number;
  is_currently_flooded: boolean;
  evacuation_recommended: boolean;
  evacuation_mandatory: boolean;
  current_water_level?: number;
  max_recorded_water_level?: number;
  district?: string;
  municipality?: string;
  responsible_officer?: string;
  emergency_contact?: string;
  color: string;
  opacity: number;
  priority_score: number;
  is_critical: boolean;
  last_assessment?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateFloodZoneData {
  name: string;
  description?: string;
  zone_code: string;
  risk_level: RiskLevel;
  zone_type: ZoneType;
  center_latitude: number;
  center_longitude: number;
  area_sqkm?: number;
  population_estimate: number;
  residential_units: number;
  commercial_units: number;
  critical_infrastructure?: string[];
  district?: string;
  municipality?: string;
  responsible_officer?: string;
  emergency_contact?: string;
}

export interface FloodZoneStats {
  total_zones: number;
  by_risk_level: Record<string, number>;
  by_zone_type: Record<string, number>;
  currently_flooded: number;
  evacuation_recommended: number;
  evacuation_mandatory: number;
  high_risk_zones: number;
  population_at_risk: number;
}
// frontend/src/types/index.ts - UPDATED IncidentStats interface

// ... existing types ...

  
  // ... rest of the types remain the same ...


// GeoJSON Types
export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, any>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  metadata?: Record<string, any>;
}

// API Response Types
export interface APIResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Dashboard Types
export interface DashboardStats {
  incidents: IncidentStats;
  rescue_units: RescueUnitStats;
  active_alerts: number;
  response_time_avg: number;
}

// Map Types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapCenter {
  lat: number;
  lng: number;
  zoom: number;
}

// Filter Types
export interface IncidentFilters {
  severity?: SeverityLevel[];
  status?: IncidentStatus[];
  incident_type?: IncidentType[];
  date_range?: {
    start: string;
    end: string;
  };
}

export interface RescueUnitFilters {
  unit_type?: UnitType[];
  status?: UnitStatus[];
  available_only?: boolean;
}

// Form Types
export interface FormErrors {
  [key: string]: string | string[];
}

// Navigation Types
export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Export utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;
"""
Updated Rescue Unit schemas for Emergency Flood Response API
backend/app/schemas/rescue_unit.py - COMPLETE VERSION
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.rescue_unit import UnitType, UnitStatus


class LocationUpdate(BaseModel):
    """Location update schema"""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    address: Optional[str] = Field(None, max_length=500, description="Current address")

    @validator('address')
    def validate_address(cls, v):
        if v is not None and not v.strip():
            return None
        return v


class RescueUnitBase(BaseModel):
    """Base rescue unit schema"""
    unit_name: str = Field(..., min_length=2, max_length=100, description="Unit name")
    call_sign: Optional[str] = Field(None, max_length=20, description="Radio call sign")
    unit_type: UnitType = Field(..., description="Type of rescue unit")
    capacity: int = Field(default=4, ge=1, le=50, description="People capacity")
    team_size: int = Field(default=2, ge=1, le=20, description="Current team size")
    team_leader: Optional[str] = Field(None, max_length=100, description="Team leader name")
    contact_number: Optional[str] = Field(None, max_length=20, description="Contact phone")
    radio_frequency: Optional[str] = Field(None, max_length=20, description="Radio frequency")
    equipment: Optional[List[str]] = Field(None, description="Equipment list")

    @validator('unit_name')
    def validate_unit_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Unit name cannot be empty')
        return v.strip()

    @validator('call_sign')
    def validate_call_sign(cls, v):
        if v is not None and not v.strip():
            return None
        return v

    @validator('team_leader')
    def validate_team_leader(cls, v):
        if v is not None and not v.strip():
            return None
        return v

    @validator('contact_number')
    def validate_contact_number(cls, v):
        if v is not None and not v.strip():
            return None
        return v

    @validator('radio_frequency')
    def validate_radio_frequency(cls, v):
        if v is not None and not v.strip():
            return None
        return v

    @validator('equipment')
    def validate_equipment(cls, v):
        if v is not None:
            # Filter out empty strings
            return [item.strip() for item in v if item and item.strip()]
        return v


class RescueUnitCreate(RescueUnitBase):
    """Rescue unit creation schema"""
    location: LocationUpdate = Field(..., description="Initial location")
    base_location: Optional[LocationUpdate] = Field(None, description="Home base location")
    
    class Config:
        json_schema_extra = {
            "example": {
                "unit_name": "Fire Rescue Unit Alpha-1",
                "call_sign": "FR-A1",
                "unit_type": "fire_rescue",
                "capacity": 6,
                "team_size": 4,
                "team_leader": "Captain Smith",
                "contact_number": "+91-9876543210",
                "radio_frequency": "156.800",
                "location": {
                    "latitude": 9.9252,
                    "longitude": 78.1198,
                    "address": "Fire Station 1, Madurai"
                },
                "equipment": ["Fire hoses", "Rescue boat", "Medical kit", "Rope rescue gear"]
            }
        }


class RescueUnitUpdate(BaseModel):
    """Rescue unit update schema"""
    unit_name: Optional[str] = Field(None, min_length=2, max_length=100)
    call_sign: Optional[str] = Field(None, max_length=20)
    unit_type: Optional[UnitType] = None
    status: Optional[UnitStatus] = None
    capacity: Optional[int] = Field(None, ge=1, le=50)
    team_size: Optional[int] = Field(None, ge=1, le=20)
    team_leader: Optional[str] = Field(None, max_length=100)
    contact_number: Optional[str] = Field(None, max_length=20)
    radio_frequency: Optional[str] = Field(None, max_length=20)
    equipment: Optional[List[str]] = None
    fuel_level: Optional[float] = Field(None, ge=0, le=100)
    current_address: Optional[str] = Field(None, max_length=500)

    @validator('unit_name')
    def validate_unit_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Unit name cannot be empty')
        return v.strip() if v else v


class RescueUnitResponse(RescueUnitBase):
    """Rescue unit response schema"""
    id: int
    status: UnitStatus
    latitude: float
    longitude: float
    current_address: Optional[str] = None
    fuel_level: Optional[float] = None
    last_maintenance: Optional[datetime] = None
    next_maintenance: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_location_update: datetime
    
    # Computed fields for frontend
    coordinates: Optional[List[float]] = None
    is_available: bool = True
    is_active: bool = True
    needs_maintenance: bool = False
    status_color: str = "#22c55e"
    type_icon: str = "🚨"

    @validator('coordinates', always=True)
    def set_coordinates(cls, v, values):
        lat = values.get('latitude')
        lng = values.get('longitude')
        if lat is not None and lng is not None:
            return [lat, lng]
        return v

    @validator('is_available', always=True)
    def set_is_available(cls, v, values):
        status = values.get('status')
        return status == UnitStatus.AVAILABLE

    @validator('is_active', always=True)
    def set_is_active(cls, v, values):
        status = values.get('status')
        return status not in [UnitStatus.OFFLINE, UnitStatus.MAINTENANCE]

    @validator('needs_maintenance', always=True)
    def set_needs_maintenance(cls, v, values):
        status = values.get('status')
        next_maintenance = values.get('next_maintenance')
        if next_maintenance and next_maintenance <= datetime.now():
            return True
        return status == UnitStatus.MAINTENANCE

    @validator('status_color', always=True)
    def set_status_color(cls, v, values):
        status = values.get('status')
        colors = {
            UnitStatus.AVAILABLE: "#22c55e",
            UnitStatus.BUSY: "#f59e0b",
            UnitStatus.EN_ROUTE: "#3b82f6",
            UnitStatus.ON_SCENE: "#8b5cf6",
            UnitStatus.OFFLINE: "#6b7280",
            UnitStatus.MAINTENANCE: "#dc2626"
        }
        return colors.get(status, "#6b7280")

    @validator('type_icon', always=True)
    def set_type_icon(cls, v, values):
        unit_type = values.get('unit_type')
        icons = {
            UnitType.FIRE_RESCUE: "🚒",
            UnitType.MEDICAL: "🚑",
            UnitType.WATER_RESCUE: "🚤",
            UnitType.EVACUATION: "🚐",
            UnitType.SEARCH_RESCUE: "🚁",
            UnitType.POLICE: "🚓",
            UnitType.EMERGENCY_SERVICES: "🚨",
            UnitType.VOLUNTEER: "👥"
        }
        return icons.get(unit_type, "🚨")
    
    class Config:
        from_attributes = True


class RescueUnitSummary(BaseModel):
    """Rescue unit summary for lists"""
    id: int
    unit_name: str
    call_sign: Optional[str] = None
    unit_type: str
    status: str
    capacity: int
    team_size: int
    latitude: float
    longitude: float
    is_available: bool = True
    status_color: str = "#22c55e"
    type_icon: str = "🚨"
    last_location_update: datetime
    distance_km: Optional[float] = None  # For nearby queries

    @validator('unit_type', pre=True)
    def convert_unit_type(cls, v):
        return v.value if hasattr(v, 'value') else str(v)

    @validator('status', pre=True)
    def convert_status(cls, v):
        return v.value if hasattr(v, 'value') else str(v)


class RescueUnitStats(BaseModel):
    """Rescue unit statistics"""
    total_units: int
    available_units: int
    busy_units: int
    offline_units: int
    by_type: Dict[str, int]
    by_status: Dict[str, int]
    average_response_time: Optional[float] = None  # Minutes
    units_needing_maintenance: int


class NearbyUnitsQuery(BaseModel):
    """Query schema for nearby rescue units"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=25.0, gt=0, le=100)
    unit_type_filter: Optional[List[UnitType]] = None
    available_only: bool = True
    max_results: int = Field(default=10, ge=1, le=50)


class UnitLocationUpdate(BaseModel):
    """Unit location update schema"""
    location: LocationUpdate = Field(..., description="New location")
    status: Optional[UnitStatus] = Field(None, description="Updated status")
    fuel_level: Optional[float] = Field(None, ge=0, le=100, description="Fuel level percentage")


class UnitStatusUpdate(BaseModel):
    """Unit status update schema"""
    status: UnitStatus = Field(..., description="New status")
    notes: Optional[str] = Field(None, max_length=500, description="Status change notes")

    @validator('notes')
    def validate_notes(cls, v):
        if v is not None and not v.strip():
            return None
        return v


class UnitAssignmentResponse(BaseModel):
    """Unit assignment response"""
    unit_id: int
    unit_name: str
    incident_id: int
    estimated_arrival_time: Optional[int] = None  # Minutes
    distance_km: Optional[float] = None
    assigned_at: datetime


class MaintenanceSchedule(BaseModel):
    """Maintenance schedule schema"""
    maintenance_type: str = Field(..., max_length=100, description="Type of maintenance")
    scheduled_date: datetime = Field(..., description="Scheduled maintenance date")
    estimated_duration_hours: int = Field(..., ge=1, le=168, description="Estimated duration in hours")
    notes: Optional[str] = Field(None, max_length=500, description="Maintenance notes")

    @validator('maintenance_type')
    def validate_maintenance_type(cls, v):
        if not v or not v.strip():
            raise ValueError('Maintenance type cannot be empty')
        return v.strip()

    @validator('notes')
    def validate_notes(cls, v):
        if v is not None and not v.strip():
            return None
        return v


class UnitPerformanceMetrics(BaseModel):
    """Unit performance metrics"""
    unit_id: int
    total_incidents_handled: int
    average_response_time_minutes: float
    success_rate_percentage: float
    last_30_days_incidents: int
    fuel_efficiency: Optional[float] = None
    maintenance_cost_last_year: Optional[float] = None


class UnitFilters(BaseModel):
    """Unit filtering schema"""
    unit_type: Optional[List[UnitType]] = None
    status: Optional[List[UnitStatus]] = None
    available_only: Optional[bool] = None
    needs_maintenance: Optional[bool] = None
    team_leader: Optional[str] = None
    location_radius: Optional[float] = None
    center_latitude: Optional[float] = None
    center_longitude: Optional[float] = None


class GeoJSONUnitGeometry(BaseModel):
    """GeoJSON geometry for units"""
    type: str = "Point"
    coordinates: List[float]


class GeoJSONUnitProperties(BaseModel):
    """GeoJSON properties for units"""
    id: int
    unit_name: str
    call_sign: Optional[str] = None
    unit_type: str
    status: str
    capacity: int
    team_size: int
    team_leader: Optional[str] = None
    contact_number: Optional[str] = None
    radio_frequency: Optional[str] = None
    fuel_level: Optional[float] = None
    current_address: Optional[str] = None
    last_location_update: str  # ISO format
    color: str
    icon: str
    is_available: bool
    needs_maintenance: bool


class GeoJSONUnitFeature(BaseModel):
    """GeoJSON feature for units"""
    type: str = "Feature"
    geometry: GeoJSONUnitGeometry
    properties: GeoJSONUnitProperties


class GeoJSONUnitCollection(BaseModel):
    """GeoJSON feature collection for units"""
    type: str = "FeatureCollection"
    features: List[GeoJSONUnitFeature]
    metadata: Optional[Dict[str, Any]] = None
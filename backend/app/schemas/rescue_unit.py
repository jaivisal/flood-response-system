"""
Pydantic schemas for Rescue Unit model
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.rescue_unit import UnitType, UnitStatus


class LocationUpdate(BaseModel):
    """Location update schema"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = Field(None, max_length=500)


class RescueUnitBase(BaseModel):
    """Base rescue unit schema"""
    unit_name: str = Field(..., min_length=2, max_length=100)
    call_sign: Optional[str] = Field(None, max_length=20)
    unit_type: UnitType
    capacity: int = Field(default=4, ge=1, le=50)
    team_size: int = Field(default=2, ge=1, le=20)
    team_leader: Optional[str] = Field(None, max_length=100)
    contact_number: Optional[str] = Field(None, max_length=20)
    radio_frequency: Optional[str] = Field(None, max_length=20)
    equipment: Optional[List[str]] = None


class RescueUnitCreate(RescueUnitBase):
    """Rescue unit creation schema"""
    location: LocationUpdate
    base_location: Optional[LocationUpdate] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "unit_name": "Fire Rescue Unit Alpha-1",
                "call_sign": "FR-A1",
                "unit_type": "fire_rescue",
                "capacity": 6,
                "team_size": 4,
                "team_leader": "Captain Smith",
                "contact_number": "+1234567890",
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
    
    # Computed fields
    coordinates: Optional[tuple] = None
    is_available: bool = True
    is_active: bool = True
    needs_maintenance: bool = False
    status_color: str = "#22c55e"
    type_icon: str = "🚨"
    
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


class RescueUnitStats(BaseModel):
    """Rescue unit statistics"""
    total_units: int
    available_units: int
    busy_units: int
    offline_units: int
    by_type: dict
    by_status: dict
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
    unit_id: int
    location: LocationUpdate
    status: Optional[UnitStatus] = None
    fuel_level: Optional[float] = Field(None, ge=0, le=100)


class UnitStatusUpdate(BaseModel):
    """Unit status update schema"""
    status: UnitStatus
    notes: Optional[str] = Field(None, max_length=500)


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
    unit_id: int
    maintenance_type: str = Field(..., max_length=100)
    scheduled_date: datetime
    estimated_duration_hours: int = Field(..., ge=1, le=168)  # Max 1 week
    notes: Optional[str] = Field(None, max_length=500)


class UnitPerformanceMetrics(BaseModel):
    """Unit performance metrics"""
    unit_id: int
    total_incidents_handled: int
    average_response_time_minutes: float
    success_rate_percentage: float
    last_30_days_incidents: int
    fuel_efficiency: Optional[float] = None
    maintenance_cost_last_year: Optional[float] = None
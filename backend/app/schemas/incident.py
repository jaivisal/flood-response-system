"""
Pydantic schemas for Incident model
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from app.models.incident import IncidentType, SeverityLevel, IncidentStatus


class LocationData(BaseModel):
    """Location data schema"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = Field(None, max_length=500)
    landmark: Optional[str] = Field(None, max_length=200)


class IncidentBase(BaseModel):
    """Base incident schema"""
    title: str = Field(..., min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    incident_type: IncidentType
    severity: SeverityLevel = SeverityLevel.MEDIUM
    affected_people_count: int = Field(default=0, ge=0)
    water_level: Optional[float] = Field(None, ge=0)


class IncidentCreate(IncidentBase):
    """Incident creation schema"""
    location: LocationData
    image_url: Optional[str] = None
    additional_images: Optional[List[str]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Severe flooding in residential area",
                "description": "Multiple houses affected by rising water levels",
                "incident_type": "flood",
                "severity": "high",
                "affected_people_count": 15,
                "water_level": 1.5,
                "location": {
                    "latitude": 9.9252,
                    "longitude": 78.1198,
                    "address": "123 Main Street, Madurai",
                    "landmark": "Near City Hospital"
                },
                "image_url": "https://example.com/flood_image.jpg"
            }
        }


class IncidentUpdate(BaseModel):
    """Incident update schema"""
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    incident_type: Optional[IncidentType] = None
    severity: Optional[SeverityLevel] = None
    status: Optional[IncidentStatus] = None
    affected_people_count: Optional[int] = Field(None, ge=0)
    water_level: Optional[float] = Field(None, ge=0)
    assigned_unit_id: Optional[int] = None
    resolved_at: Optional[datetime] = None


class IncidentResponse(IncidentBase):
    """Incident response schema"""
    id: int
    status: IncidentStatus
    latitude: float
    longitude: float
    address: Optional[str] = None
    landmark: Optional[str] = None
    image_url: Optional[str] = None
    additional_images: Optional[List[str]] = None
    reporter_id: int
    assigned_unit_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    
    # Computed fields
    coordinates: Optional[tuple] = None
    is_critical: bool = False
    requires_immediate_attention: bool = False
    severity_color: str = "#6b7280"
    
    class Config:
        from_attributes = True


class IncidentSummary(BaseModel):
    """Incident summary for lists"""
    id: int
    title: str
    incident_type: str
    severity: str
    status: str
    affected_people_count: int
    latitude: float
    longitude: float
    address: Optional[str] = None
    created_at: datetime
    is_critical: bool = False
    severity_color: str = "#6b7280"


class IncidentStats(BaseModel):
    """Incident statistics"""
    total_incidents: int
    by_severity: dict
    by_status: dict
    by_type: dict
    critical_incidents: int
    resolved_incidents: int
    average_resolution_time: Optional[float] = None  # Hours


class NearbyIncidentsQuery(BaseModel):
    """Query schema for nearby incidents"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=10.0, gt=0, le=100)
    severity_filter: Optional[List[SeverityLevel]] = None
    status_filter: Optional[List[IncidentStatus]] = None
    incident_type_filter: Optional[List[IncidentType]] = None


class IncidentAssignment(BaseModel):
    """Incident assignment schema"""
    incident_id: int
    rescue_unit_id: int
    notes: Optional[str] = Field(None, max_length=500)


class GeoJSONFeature(BaseModel):
    """GeoJSON feature schema"""
    type: str = "Feature"
    geometry: dict
    properties: dict


class GeoJSONFeatureCollection(BaseModel):
    """GeoJSON feature collection schema"""
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]
    metadata: Optional[dict] = None
"""
Updated Incident schemas for Emergency Flood Response API
backend/app/schemas/incident.py - COMPLETE VERSION
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.incident import IncidentType, SeverityLevel, IncidentStatus


class LocationData(BaseModel):
    """Location data schema"""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    address: Optional[str] = Field(None, max_length=500, description="Street address")
    landmark: Optional[str] = Field(None, max_length=200, description="Nearby landmark")

    @validator('address')
    def validate_address(cls, v):
        if v is not None and not v.strip():
            return None
        return v

    @validator('landmark')
    def validate_landmark(cls, v):
        if v is not None and not v.strip():
            return None
        return v


class IncidentBase(BaseModel):
    """Base incident schema"""
    title: str = Field(..., min_length=5, max_length=200, description="Incident title")
    description: Optional[str] = Field(None, max_length=2000, description="Detailed description")
    incident_type: IncidentType = Field(..., description="Type of incident")
    severity: SeverityLevel = Field(SeverityLevel.MEDIUM, description="Severity level")
    affected_people_count: int = Field(default=0, ge=0, description="Number of people affected")
    water_level: Optional[float] = Field(None, ge=0, description="Water level in meters")

    @validator('title')
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()

    @validator('description')
    def validate_description(cls, v):
        if v is not None and not v.strip():
            return None
        return v


class IncidentCreate(IncidentBase):
    """Incident creation schema"""
    location: LocationData = Field(..., description="Incident location")
    image_url: Optional[str] = Field(None, description="Primary image URL")
    additional_images: Optional[List[str]] = Field(None, description="Additional image URLs")
    
    @validator('additional_images')
    def validate_additional_images(cls, v):
        if v is not None:
            # Filter out empty strings
            return [img for img in v if img and img.strip()]
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Severe flooding in residential area",
                "description": "Multiple houses affected by rising water levels due to heavy rainfall",
                "incident_type": "flood",
                "severity": "high",
                "affected_people_count": 15,
                "water_level": 1.5,
                "location": {
                    "latitude": 9.9252,
                    "longitude": 78.1198,
                    "address": "123 Main Street, Madurai, Tamil Nadu",
                    "landmark": "Near City Hospital"
                },
                "image_url": "https://example.com/flood_image.jpg",
                "additional_images": [
                    "https://example.com/flood_image2.jpg",
                    "https://example.com/flood_image3.jpg"
                ]
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

    @validator('title')
    def validate_title(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Title cannot be empty')
        return v.strip() if v else v


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
    
    # Computed fields for frontend
    coordinates: Optional[List[float]] = None
    is_critical: bool = False
    requires_immediate_attention: bool = False
    severity_color: str = "#6b7280"
    
    @validator('coordinates', always=True)
    def set_coordinates(cls, v, values):
        lat = values.get('latitude')
        lng = values.get('longitude')
        if lat is not None and lng is not None:
            return [lat, lng]
        return v

    @validator('is_critical', always=True)
    def set_is_critical(cls, v, values):
        severity = values.get('severity')
        return severity == SeverityLevel.CRITICAL

    @validator('requires_immediate_attention', always=True)
    def set_requires_immediate_attention(cls, v, values):
        severity = values.get('severity')
        status = values.get('status')
        return (
            severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL] and
            status == IncidentStatus.REPORTED
        )

    @validator('severity_color', always=True)
    def set_severity_color(cls, v, values):
        severity = values.get('severity')
        colors = {
            SeverityLevel.LOW: "#22c55e",
            SeverityLevel.MEDIUM: "#f59e0b",
            SeverityLevel.HIGH: "#f97316",
            SeverityLevel.CRITICAL: "#dc2626"
        }
        return colors.get(severity, "#6b7280")
    
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

    @validator('incident_type', pre=True)
    def convert_incident_type(cls, v):
        return v.value if hasattr(v, 'value') else str(v)

    @validator('severity', pre=True)
    def convert_severity(cls, v):
        return v.value if hasattr(v, 'value') else str(v)

    @validator('status', pre=True)
    def convert_status(cls, v):
        return v.value if hasattr(v, 'value') else str(v)


class IncidentStats(BaseModel):
    """Incident statistics"""
    total_incidents: int
    by_severity: Dict[str, int]
    by_status: Dict[str, int]
    by_type: Dict[str, int]
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
    incident_id: int = Field(..., gt=0)
    rescue_unit_id: int = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=500)

    @validator('notes')
    def validate_notes(cls, v):
        if v is not None and not v.strip():
            return None
        return v


class GeoJSONGeometry(BaseModel):
    """GeoJSON geometry schema"""
    type: str
    coordinates: List[float]


class GeoJSONProperties(BaseModel):
    """GeoJSON properties schema"""
    id: int
    title: str
    description: Optional[str] = None
    incident_type: str
    severity: str
    status: str
    affected_people_count: int
    water_level: Optional[float] = None
    image_url: Optional[str] = None
    address: Optional[str] = None
    landmark: Optional[str] = None
    reporter_id: int
    assigned_unit_id: Optional[int] = None
    created_at: str  # ISO format string
    updated_at: Optional[str] = None
    color: str


class GeoJSONFeature(BaseModel):
    """GeoJSON feature schema"""
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: GeoJSONProperties


class GeoJSONFeatureCollection(BaseModel):
    """GeoJSON feature collection schema"""
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]
    metadata: Optional[Dict[str, Any]] = None


class IncidentFilters(BaseModel):
    """Incident filtering schema"""
    severity: Optional[List[SeverityLevel]] = None
    status: Optional[List[IncidentStatus]] = None
    incident_type: Optional[List[IncidentType]] = None
    reporter_id: Optional[int] = None
    assigned_unit_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    has_water_level: Optional[bool] = None
    affected_people_min: Optional[int] = None
    affected_people_max: Optional[int] = None


class IncidentBulkUpdate(BaseModel):
    """Bulk update schema"""
    incident_ids: List[int] = Field(..., min_items=1)
    updates: IncidentUpdate

    @validator('incident_ids')
    def validate_incident_ids(cls, v):
        if not v:
            raise ValueError('At least one incident ID is required')
        # Remove duplicates
        return list(set(v))
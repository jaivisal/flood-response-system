"""
Pydantic schemas for Flood Zone model
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from app.models.flood_zone import RiskLevel, ZoneType


class FloodZoneBase(BaseModel):
    """Base flood zone schema"""
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    zone_code: str = Field(..., min_length=2, max_length=50)
    risk_level: RiskLevel = RiskLevel.MEDIUM
    zone_type: ZoneType = ZoneType.MIXED
    area_sqkm: Optional[float] = Field(None, ge=0)
    population_estimate: int = Field(default=0, ge=0)
    residential_units: int = Field(default=0, ge=0)
    commercial_units: int = Field(default=0, ge=0)
    district: Optional[str] = Field(None, max_length=100)
    municipality: Optional[str] = Field(None, max_length=100)
    responsible_officer: Optional[str] = Field(None, max_length=100)
    emergency_contact: Optional[str] = Field(None, max_length=20)


class FloodZoneCreate(FloodZoneBase):
    """Flood zone creation schema"""
    center_latitude: float = Field(..., ge=-90, le=90)
    center_longitude: float = Field(..., ge=-180, le=180)
    critical_infrastructure: Optional[List[str]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Vaigai River Basin - North",
                "description": "Northern section of Vaigai river basin with high flood risk",
                "zone_code": "VRB-N-001",
                "risk_level": "high",
                "zone_type": "residential",
                "center_latitude": 9.9252,
                "center_longitude": 78.1198,
                "area_sqkm": 15.5,
                "population_estimate": 25000,
                "residential_units": 5000,
                "commercial_units": 200,
                "district": "Madurai",
                "municipality": "Madurai Corporation",
                "responsible_officer": "Dr. Kumar Selvam",
                "emergency_contact": "+91-9876543210",
                "critical_infrastructure": ["Hospital", "School", "Police Station"]
            }
        }


class FloodZoneUpdate(BaseModel):
    """Flood zone update schema"""
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    risk_level: Optional[RiskLevel] = None
    zone_type: Optional[ZoneType] = None
    area_sqkm: Optional[float] = Field(None, ge=0)
    population_estimate: Optional[int] = Field(None, ge=0)
    residential_units: Optional[int] = Field(None, ge=0)
    commercial_units: Optional[int] = Field(None, ge=0)
    critical_infrastructure: Optional[List[str]] = None
    current_water_level: Optional[float] = Field(None, ge=0)
    is_currently_flooded: Optional[bool] = None
    evacuation_recommended: Optional[bool] = None
    evacuation_mandatory: Optional[bool] = None
    district: Optional[str] = Field(None, max_length=100)
    municipality: Optional[str] = Field(None, max_length=100)
    responsible_officer: Optional[str] = Field(None, max_length=100)
    emergency_contact: Optional[str] = Field(None, max_length=20)


class FloodZoneResponse(FloodZoneBase):
    """Flood zone response schema"""
    id: int
    last_major_flood: Optional[datetime] = None
    flood_frequency_years: Optional[int] = None
    max_recorded_water_level: Optional[float] = None
    current_water_level: Optional[float] = None
    is_currently_flooded: bool = False
    evacuation_recommended: bool = False
    evacuation_mandatory: bool = False
    critical_infrastructure: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_assessment: Optional[datetime] = None
    
    # Computed fields
    color: str = "#6b7280"
    opacity: float = 0.5
    priority_score: int = 0
    is_critical: bool = False
    
    class Config:
        from_attributes = True


class FloodZoneSummary(BaseModel):
    """Flood zone summary for lists"""
    id: int
    name: str
    zone_code: str
    risk_level: str
    zone_type: str
    population_estimate: int
    area_sqkm: Optional[float] = None
    is_currently_flooded: bool = False
    evacuation_recommended: bool = False
    evacuation_mandatory: bool = False
    district: Optional[str] = None
    municipality: Optional[str] = None
    color: str = "#6b7280"
    priority_score: int = 0
    is_critical: bool = False
    last_assessment: Optional[datetime] = None


class FloodZoneStats(BaseModel):
    """Flood zone statistics"""
    total_zones: int
    by_risk_level: dict
    by_zone_type: dict
    currently_flooded: int
    evacuation_recommended: int
    evacuation_mandatory: int
    high_risk_zones: int
    population_at_risk: int


class RiskAssessmentUpdate(BaseModel):
    """Risk assessment update schema"""
    risk_level: RiskLevel
    current_water_level: Optional[float] = Field(None, ge=0)
    is_currently_flooded: bool = False
    assessment_notes: Optional[str] = Field(None, max_length=1000)
    
    class Config:
        json_schema_extra = {
            "example": {
                "risk_level": "high",
                "current_water_level": 2.5,
                "is_currently_flooded": True,
                "assessment_notes": "Water levels rising due to heavy rainfall upstream"
            }
        }


class EvacuationOrder(BaseModel):
    """Evacuation order schema"""
    evacuation_recommended: bool = False
    evacuation_mandatory: bool = False
    reason: str = Field(..., min_length=10, max_length=500)
    effective_immediately: bool = True
    
    @validator('evacuation_mandatory')
    def validate_evacuation_order(cls, v, values):
        if v and values.get('evacuation_recommended'):
            raise ValueError('Cannot have both recommended and mandatory evacuation')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "evacuation_recommended": False,
                "evacuation_mandatory": True,
                "reason": "Immediate flood risk due to dam overflow. All residents must evacuate within 2 hours.",
                "effective_immediately": True
            }
        }


class ZoneAlert(BaseModel):
    """Zone alert schema"""
    zone_id: int
    zone_name: str
    alert_type: str  # "critical_risk", "flooding_active", "evacuation_mandatory", etc.
    severity: str  # "low", "medium", "high", "critical"
    message: str
    created_at: datetime


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


class ZoneCoverageAnalysis(BaseModel):
    """Zone coverage analysis schema"""
    zone_id: int
    zone_name: str
    rescue_units_in_range: int
    nearest_unit_distance_km: Optional[float] = None
    estimated_response_time_minutes: Optional[float] = None
    coverage_adequacy: str  # "excellent", "good", "adequate", "poor"
    recommendations: List[str]


class FloodPrediction(BaseModel):
    """Flood prediction schema"""
    zone_id: int
    predicted_risk_level: RiskLevel
    prediction_confidence: float = Field(..., ge=0, le=1)
    predicted_water_level: Optional[float] = None
    time_to_peak_hours: Optional[int] = None
    factors: List[str]  # ["heavy_rainfall", "dam_release", "high_tide", etc.]
    recommendations: List[str]
    valid_until: datetime
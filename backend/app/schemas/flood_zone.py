"""
Updated Flood Zone schemas for Emergency Flood Response API
backend/app/schemas/flood_zone.py - COMPLETE VERSION
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.flood_zone import RiskLevel, ZoneType


class FloodZoneBase(BaseModel):
    """Base flood zone schema"""
    name: str = Field(..., min_length=2, max_length=200, description="Zone name")
    description: Optional[str] = Field(None, max_length=2000, description="Zone description")
    zone_code: str = Field(..., min_length=2, max_length=50, description="Unique zone code")
    risk_level: RiskLevel = Field(RiskLevel.MEDIUM, description="Risk assessment level")
    zone_type: ZoneType = Field(ZoneType.MIXED, description="Type of zone")
    area_sqkm: Optional[float] = Field(None, ge=0, description="Area in square kilometers")
    population_estimate: int = Field(default=0, ge=0, description="Estimated population")
    residential_units: int = Field(default=0, ge=0, description="Number of residential units")
    commercial_units: int = Field(default=0, ge=0, description="Number of commercial units")
    district: Optional[str] = Field(None, max_length=100, description="District name")
    municipality: Optional[str] = Field(None, max_length=100, description="Municipality name")
    responsible_officer: Optional[str] = Field(None, max_length=100, description="Responsible officer")
    emergency_contact: Optional[str] = Field(None, max_length=20, description="Emergency contact number")

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Zone name cannot be empty')
        return v.strip()

    @validator('zone_code')
    def validate_zone_code(cls, v):
        if not v or not v.strip():
            raise ValueError('Zone code cannot be empty')
        return v.strip().upper()

    @validator('description')
    def validate_description(cls, v):
        if v is not None and not v.strip():
            return None
        return v

    @validator('district')
    def validate_district(cls, v):
        if v is not None and not v.strip():
            return None
        return v

    @validator('municipality')
    def validate_municipality(cls, v):
        if v is not None and not v.strip():
            return None
        return v

    @validator('responsible_officer')
    def validate_responsible_officer(cls, v):
        if v is not None and not v.strip():
            return None
        return v

    @validator('emergency_contact')
    def validate_emergency_contact(cls, v):
        if v is not None and not v.strip():
            return None
        return v


class FloodZoneCreate(FloodZoneBase):
    """Flood zone creation schema"""
    center_latitude: float = Field(..., ge=-90, le=90, description="Center latitude")
    center_longitude: float = Field(..., ge=-180, le=180, description="Center longitude")
    critical_infrastructure: Optional[List[str]] = Field(None, description="Critical infrastructure list")
    
    @validator('critical_infrastructure')
    def validate_critical_infrastructure(cls, v):
        if v is not None:
            # Filter out empty strings
            return [item.strip() for item in v if item and item.strip()]
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Vaigai River Basin - North",
                "description": "Northern section of Vaigai river basin with high flood risk during monsoon",
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
                "critical_infrastructure": ["Hospital", "School", "Police Station", "Water Treatment Plant"]
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

    @validator('name')
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Zone name cannot be empty')
        return v.strip() if v else v

    @validator('critical_infrastructure')
    def validate_critical_infrastructure(cls, v):
        if v is not None:
            return [item.strip() for item in v if item and item.strip()]
        return v


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
    
    # Computed fields for frontend
    color: str = "#6b7280"
    opacity: float = 0.5
    priority_score: int = 0
    is_critical: bool = False
    
    @validator('color', always=True)
    def set_color(cls, v, values):
        risk_level = values.get('risk_level')
        colors = {
            RiskLevel.VERY_LOW: "#10b981",
            RiskLevel.LOW: "#22c55e",
            RiskLevel.MEDIUM: "#f59e0b",
            RiskLevel.HIGH: "#f97316",
            RiskLevel.VERY_HIGH: "#dc2626",
            RiskLevel.EXTREME: "#7c2d12"
        }
        return colors.get(risk_level, "#6b7280")

    @validator('opacity', always=True)
    def set_opacity(cls, v, values):
        risk_level = values.get('risk_level')
        opacities = {
            RiskLevel.VERY_LOW: 0.2,
            RiskLevel.LOW: 0.3,
            RiskLevel.MEDIUM: 0.4,
            RiskLevel.HIGH: 0.6,
            RiskLevel.VERY_HIGH: 0.8,
            RiskLevel.EXTREME: 0.9
        }
        return opacities.get(risk_level, 0.5)

    @validator('priority_score', always=True)
    def set_priority_score(cls, v, values):
        risk_level = values.get('risk_level')
        population = values.get('population_estimate', 0)
        is_flooded = values.get('is_currently_flooded', False)
        evacuation_mandatory = values.get('evacuation_mandatory', False)
        evacuation_recommended = values.get('evacuation_recommended', False)
        
        score = 0
        
        # Risk level scoring
        risk_scores = {
            RiskLevel.VERY_LOW: 10,
            RiskLevel.LOW: 20,
            RiskLevel.MEDIUM: 30,
            RiskLevel.HIGH: 40,
            RiskLevel.VERY_HIGH: 50,
            RiskLevel.EXTREME: 60
        }
        score += risk_scores.get(risk_level, 0)
        
        # Population factor
        if population > 10000:
            score += 20
        elif population > 5000:
            score += 15
        elif population > 1000:
            score += 10
        
        # Current conditions
        if is_flooded:
            score += 30
        if evacuation_mandatory:
            score += 25
        elif evacuation_recommended:
            score += 15
        
        return min(score, 100)

    @validator('is_critical', always=True)
    def set_is_critical(cls, v, values):
        risk_level = values.get('risk_level')
        is_flooded = values.get('is_currently_flooded', False)
        evacuation_mandatory = values.get('evacuation_mandatory', False)
        
        return (
            risk_level == RiskLevel.EXTREME or
            is_flooded or
            evacuation_mandatory
        )
    
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

    @validator('risk_level', pre=True)
    def convert_risk_level(cls, v):
        return v.value if hasattr(v, 'value') else str(v)

    @validator('zone_type', pre=True)
    def convert_zone_type(cls, v):
        return v.value if hasattr(v, 'value') else str(v)


class FloodZoneStats(BaseModel):
    """Flood zone statistics"""
    total_zones: int
    by_risk_level: Dict[str, int]
    by_zone_type: Dict[str, int]
    currently_flooded: int
    evacuation_recommended: int
    evacuation_mandatory: int
    high_risk_zones: int
    population_at_risk: int


class RiskAssessmentUpdate(BaseModel):
    """Risk assessment update schema"""
    risk_level: RiskLevel = Field(..., description="New risk level")
    current_water_level: Optional[float] = Field(None, ge=0, description="Current water level in meters")
    is_currently_flooded: bool = Field(False, description="Is zone currently flooded")
    assessment_notes: Optional[str] = Field(None, max_length=1000, description="Assessment notes")
    
    @validator('assessment_notes')
    def validate_assessment_notes(cls, v):
        if v is not None and not v.strip():
            return None
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "risk_level": "high",
                "current_water_level": 2.5,
                "is_currently_flooded": True,
                "assessment_notes": "Water levels rising due to heavy rainfall upstream. Evacuation recommended for low-lying areas."
            }
        }


class EvacuationOrder(BaseModel):
    """Evacuation order schema"""
    evacuation_recommended: bool = Field(False, description="Evacuation recommended")
    evacuation_mandatory: bool = Field(False, description="Evacuation mandatory")
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for evacuation order")
    effective_immediately: bool = Field(True, description="Effective immediately")
    
    @validator('reason')
    def validate_reason(cls, v):
        if not v or not v.strip():
            raise ValueError('Reason cannot be empty')
        return v.strip()

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


class GeoJSONZoneGeometry(BaseModel):
    """GeoJSON geometry for zones"""
    type: str = "Polygon"
    coordinates: List[List[List[float]]]

class GeoJSONFeatureCollection(BaseModel):
    """Generic GeoJSON Feature with any properties"""
    type: str = "Feature"
    properties: Dict[str, Any]
    


class GeoJSONZoneProperties(BaseModel):
    """GeoJSON properties for zones"""
    id: int
    name: str
    description: Optional[str] = None
    zone_code: str
    risk_level: str
    zone_type: str
    population_estimate: int
    area_sqkm: Optional[float] = None
    is_currently_flooded: bool
    evacuation_recommended: bool
    evacuation_mandatory: bool
    current_water_level: Optional[float] = None
    max_recorded_water_level: Optional[float] = None
    district: Optional[str] = None
    municipality: Optional[str] = None
    responsible_officer: Optional[str] = None
    emergency_contact: Optional[str] = None
    color: str
    opacity: float
    priority_score: int
    is_critical: bool
    last_assessment: Optional[str] = None  # ISO format


class GeoJSONZoneFeature(BaseModel):
    """GeoJSON feature for zones"""
    type: str = "Feature"
    geometry: GeoJSONZoneGeometry
    properties: GeoJSONZoneProperties


class GeoJSONZoneCollection(BaseModel):
    """GeoJSON feature collection for zones"""
    type: str = "FeatureCollection"
    features: List[GeoJSONZoneFeature]
    metadata: Optional[Dict[str, Any]] = None


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


class ZoneFilters(BaseModel):
    """Zone filtering schema"""
    risk_level: Optional[List[RiskLevel]] = None
    zone_type: Optional[List[ZoneType]] = None
    is_currently_flooded: Optional[bool] = None
    evacuation_status: Optional[str] = None  # "none", "recommended", "mandatory"
    district: Optional[str] = None
    municipality: Optional[str] = None
    population_min: Optional[int] = None
    population_max: Optional[int] = None
    area_min: Optional[float] = None
    area_max: Optional[float] = None
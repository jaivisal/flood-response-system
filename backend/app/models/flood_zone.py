"""
Updated Flood Zone model for Emergency Flood Response System
backend/app/models/flood_zone.py - FIXED VERSION FOR FRONTEND INTEGRATION
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, Float, Boolean, case, func
from sqlalchemy.ext.hybrid import hybrid_property
from geoalchemy2 import Geography
import enum
import json

from app.database import Base


class RiskLevel(str, enum.Enum):
    """Risk levels"""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"
    EXTREME = "extreme"


class ZoneType(str, enum.Enum):
    """Zone types"""
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    AGRICULTURAL = "agricultural"
    NATURAL = "natural"
    MIXED = "mixed"


class FloodZone(Base):
    """Flood Zone model with proper coordinate handling"""
    __tablename__ = "flood_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    zone_code = Column(String, unique=True, nullable=False, index=True)
    
    # Risk assessment
    risk_level = Column(Enum(RiskLevel), nullable=False, default=RiskLevel.MEDIUM)
    zone_type = Column(Enum(ZoneType), nullable=False, default=ZoneType.MIXED)
    
    # Geographic data - FIXED for frontend integration
    zone_boundary = Column(Geography('POLYGON', srid=4326), nullable=True)
    center_point = Column(Geography('POINT', srid=4326), nullable=True)
    
    # Store coordinates separately for easier frontend access
    center_latitude = Column(Float, nullable=True)
    center_longitude = Column(Float, nullable=True)
    
    area_sqkm = Column(Float, nullable=True)  # Area in square kilometers
    
    # Demographics and infrastructure
    population_estimate = Column(Integer, default=0)
    residential_units = Column(Integer, default=0)
    commercial_units = Column(Integer, default=0)
    critical_infrastructure = Column(Text, nullable=True)  # JSON string
    
    # Historical data
    last_major_flood = Column(DateTime(timezone=True), nullable=True)
    flood_frequency_years = Column(Integer, nullable=True)
    max_recorded_water_level = Column(Float, nullable=True)
    
    # Current conditions
    current_water_level = Column(Float, nullable=True)
    is_currently_flooded = Column(Boolean, default=False)
    evacuation_recommended = Column(Boolean, default=False)
    evacuation_mandatory = Column(Boolean, default=False)
    
    # Administrative
    district = Column(String, nullable=True)
    municipality = Column(String, nullable=True)
    responsible_officer = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_assessment = Column(DateTime(timezone=True), nullable=True)

    def get_risk_color(self) -> str:
        """Get color code for risk level"""
        colors = {
            RiskLevel.VERY_LOW: "#10b981",    # Green
            RiskLevel.LOW: "#22c55e",         # Light Green
            RiskLevel.MEDIUM: "#f59e0b",      # Yellow
            RiskLevel.HIGH: "#f97316",        # Orange
            RiskLevel.VERY_HIGH: "#dc2626",   # Red
            RiskLevel.EXTREME: "#7c2d12"      # Dark Red
        }
        return colors.get(self.risk_level, "#6b7280")

    def get_risk_opacity(self) -> float:
        """Get opacity for risk level visualization"""
        opacities = {
            RiskLevel.VERY_LOW: 0.2,
            RiskLevel.LOW: 0.3,
            RiskLevel.MEDIUM: 0.4,
            RiskLevel.HIGH: 0.6,
            RiskLevel.VERY_HIGH: 0.8,
            RiskLevel.EXTREME: 0.9
        }
        return opacities.get(self.risk_level, 0.5)

    def is_high_risk(self) -> bool:
        """Check if zone is high risk"""
        return self.risk_level in [RiskLevel.HIGH, RiskLevel.VERY_HIGH, RiskLevel.EXTREME]

    def requires_evacuation(self) -> bool:
        """Check if zone requires evacuation"""
        return self.evacuation_recommended or self.evacuation_mandatory

    def is_critical(self) -> bool:
        """Check if zone is in critical condition"""
        return (
            self.is_currently_flooded or 
            self.evacuation_mandatory or
            self.risk_level == RiskLevel.EXTREME
        )

    @hybrid_property
    def priority_score(self) -> int:
        """Get priority score for resource allocation"""
        return self.get_priority_score()

    @priority_score.expression
    def priority_score(cls):
        """SQLAlchemy expression for priority score calculation"""
        # Risk level scoring
        risk_score = case(
            (cls.risk_level == RiskLevel.EXTREME, 60),
            (cls.risk_level == RiskLevel.VERY_HIGH, 50),
            (cls.risk_level == RiskLevel.HIGH, 40),
            (cls.risk_level == RiskLevel.MEDIUM, 30),
            (cls.risk_level == RiskLevel.LOW, 20),
            (cls.risk_level == RiskLevel.VERY_LOW, 10),
            else_=0
        )
        
        # Population factor
        population_score = case(
            (cls.population_estimate > 10000, 20),
            (cls.population_estimate > 5000, 15),
            (cls.population_estimate > 1000, 10),
            else_=0
        )
        
        # Current conditions scoring
        flooding_score = case(
            (cls.is_currently_flooded == True, 30),
            else_=0
        )
        
        evacuation_score = case(
            (cls.evacuation_mandatory == True, 25),
            (cls.evacuation_recommended == True, 15),
            else_=0
        )
        
        # Return total score (max 100)
        total_score = risk_score + population_score + flooding_score + evacuation_score
        return func.least(total_score, 100)

    def get_priority_score(self) -> int:
        """Calculate priority score - Python method version"""
        score = 0
        
        # Risk level scoring
        risk_scores = {
            RiskLevel.VERY_LOW: 1,
            RiskLevel.LOW: 2,
            RiskLevel.MEDIUM: 3,
            RiskLevel.HIGH: 4,
            RiskLevel.VERY_HIGH: 5,
            RiskLevel.EXTREME: 6
        }
        score += risk_scores.get(self.risk_level, 0) * 10
        
        # Population factor
        if self.population_estimate > 10000:
            score += 20
        elif self.population_estimate > 5000:
            score += 15
        elif self.population_estimate > 1000:
            score += 10
        
        # Current conditions
        if self.is_currently_flooded:
            score += 30
        if self.evacuation_mandatory:
            score += 25
        elif self.evacuation_recommended:
            score += 15
        
        return min(score, 100)

    def get_critical_infrastructure_list(self) -> list:
        """Get critical infrastructure as a list"""
        if not self.critical_infrastructure:
            return []
        try:
            return json.loads(self.critical_infrastructure)
        except (json.JSONDecodeError, TypeError):
            # If it's not valid JSON, treat as comma-separated string
            return [item.strip() for item in self.critical_infrastructure.split(',') if item.strip()]

    def set_critical_infrastructure_list(self, infrastructure_list: list):
        """Set critical infrastructure from a list"""
        if infrastructure_list:
            self.critical_infrastructure = json.dumps(infrastructure_list)
        else:
            self.critical_infrastructure = None

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "zone_code": self.zone_code,
            "risk_level": self.risk_level.value,
            "zone_type": self.zone_type.value,
            "center_latitude": self.center_latitude,
            "center_longitude": self.center_longitude,
            "area_sqkm": self.area_sqkm,
            "population_estimate": self.population_estimate,
            "residential_units": self.residential_units,
            "commercial_units": self.commercial_units,
            "critical_infrastructure": self.get_critical_infrastructure_list(),
            "last_major_flood": self.last_major_flood.isoformat() if self.last_major_flood else None,
            "flood_frequency_years": self.flood_frequency_years,
            "max_recorded_water_level": self.max_recorded_water_level,
            "current_water_level": self.current_water_level,
            "is_currently_flooded": self.is_currently_flooded,
            "evacuation_recommended": self.evacuation_recommended,
            "evacuation_mandatory": self.evacuation_mandatory,
            "district": self.district,
            "municipality": self.municipality,
            "responsible_officer": self.responsible_officer,
            "emergency_contact": self.emergency_contact,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_assessment": self.last_assessment.isoformat() if self.last_assessment else None,
            "color": self.get_risk_color(),
            "opacity": self.get_risk_opacity(),
            "priority_score": self.get_priority_score(),
            "is_critical": self.is_critical()
        }

    def to_geojson_feature(self) -> dict:
        """Convert to GeoJSON feature for map display"""
        # If we have center coordinates, create a simple point feature
        # In production, you'd use actual polygon boundaries
        geometry = None
        if self.center_latitude and self.center_longitude:
            geometry = {
                "type": "Point",
                "coordinates": [self.center_longitude, self.center_latitude]
            }
        elif self.zone_boundary:
            # Convert PostGIS geometry to GeoJSON (simplified)
            geometry = {
                "type": "Polygon",
                "coordinates": [[]]  # Would contain actual coordinates from PostGIS
            }
        
        return {
            "type": "Feature",
            "geometry": geometry,
            "properties": {
                "id": self.id,
                "name": self.name,
                "description": self.description,
                "zone_code": self.zone_code,
                "risk_level": self.risk_level.value,
                "zone_type": self.zone_type.value,
                "population_estimate": self.population_estimate,
                "area_sqkm": self.area_sqkm,
                "is_currently_flooded": self.is_currently_flooded,
                "evacuation_recommended": self.evacuation_recommended,
                "evacuation_mandatory": self.evacuation_mandatory,
                "current_water_level": self.current_water_level,
                "max_recorded_water_level": self.max_recorded_water_level,
                "district": self.district,
                "municipality": self.municipality,
                "responsible_officer": self.responsible_officer,
                "emergency_contact": self.emergency_contact,
                "color": self.get_risk_color(),
                "opacity": self.get_risk_opacity(),
                "priority_score": self.get_priority_score(),
                "is_critical": self.is_critical(),
                "last_assessment": self.last_assessment.isoformat() if self.last_assessment else None
            }
        }

    def __repr__(self):
        return f"<FloodZone(name='{self.name}', risk='{self.risk_level}', code='{self.zone_code}')>"
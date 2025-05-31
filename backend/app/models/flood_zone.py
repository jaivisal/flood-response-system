"""
Flood Zone model for risk assessment areas
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, Float, Boolean
from sqlalchemy.sql import func
from geoalchemy2 import Geography
import enum

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
    """Flood Zone model"""
    __tablename__ = "flood_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    zone_code = Column(String, unique=True, nullable=False)
    
    # Risk assessment
    risk_level = Column(Enum(RiskLevel), nullable=False, default=RiskLevel.MEDIUM)
    zone_type = Column(Enum(ZoneType), nullable=False, default=ZoneType.MIXED)
    
    # Geographic data (PostGIS - Polygon)
    zone_boundary = Column(Geography('POLYGON', srid=4326), nullable=False)
    center_point = Column(Geography('POINT', srid=4326), nullable=True)
    area_sqkm = Column(Float, nullable=True)  # Area in square kilometers
    
    # Demographics and infrastructure
    population_estimate = Column(Integer, default=0)
    residential_units = Column(Integer, default=0)
    commercial_units = Column(Integer, default=0)
    critical_infrastructure = Column(Text, nullable=True)  # JSON array
    
    # Historical data
    last_major_flood = Column(DateTime(timezone=True), nullable=True)
    flood_frequency_years = Column(Integer, nullable=True)  # Average years between floods
    max_recorded_water_level = Column(Float, nullable=True)  # Meters
    
    # Current conditions
    current_water_level = Column(Float, nullable=True)  # Current water level in meters
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

    def get_priority_score(self) -> int:
        """Get priority score for resource allocation"""
    # This should be a regular method, not a column expression
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

    def to_geojson_feature(self) -> dict:
        """Convert to GeoJSON feature"""
        # Note: This is a simplified representation
        # In a real implementation, you'd extract the actual polygon coordinates
        return {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[]]  # Would contain actual polygon coordinates
            },
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
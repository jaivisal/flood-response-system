"""
Incident model for emergency flood incidents
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geography
import enum

from app.database import Base


class IncidentType(str, enum.Enum):
    """Incident types"""
    FLOOD = "flood"
    RESCUE_NEEDED = "rescue_needed"
    INFRASTRUCTURE_DAMAGE = "infrastructure_damage"
    ROAD_CLOSURE = "road_closure"
    POWER_OUTAGE = "power_outage"
    WATER_CONTAMINATION = "water_contamination"
    EVACUATION_REQUIRED = "evacuation_required"
    MEDICAL_EMERGENCY = "medical_emergency"
    OTHER = "other"


class SeverityLevel(str, enum.Enum):
    """Severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, enum.Enum):
    """Incident status"""
    REPORTED = "reported"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class Incident(Base):
    """Incident model"""
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    incident_type = Column(Enum(IncidentType), nullable=False)
    severity = Column(Enum(SeverityLevel), nullable=False, default=SeverityLevel.MEDIUM)
    status = Column(Enum(IncidentStatus), nullable=False, default=IncidentStatus.REPORTED)
    
    # Location data (PostGIS)
    location = Column(Geography('POINT', srid=4326), nullable=False)
    address = Column(String, nullable=True)
    landmark = Column(String, nullable=True)
    
    # Metadata
    affected_people_count = Column(Integer, default=0)
    water_level = Column(Float, nullable=True)  # Water level in meters
    image_url = Column(String, nullable=True)
    additional_images = Column(Text, nullable=True)  # JSON array of image URLs
    
    # Relationships
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_unit_id = Column(Integer, ForeignKey("rescue_units.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    reporter = relationship("User", back_populates="reported_incidents")
    assigned_unit = relationship("RescueUnit", back_populates="assigned_incidents")

    @property
    def latitude(self) -> float:
        """Get latitude from location"""
        if self.location:
            return self.location.latitude
        return None

    @property
    def longitude(self) -> float:
        """Get longitude from location"""
        if self.location:
            return self.location.longitude
        return None

    @property
    def coordinates(self) -> tuple:
        """Get coordinates as (lat, lng) tuple"""
        if self.location:
            return (self.latitude, self.longitude)
        return None

    def is_critical(self) -> bool:
        """Check if incident is critical"""
        return self.severity == SeverityLevel.CRITICAL

    def is_resolved(self) -> bool:
        """Check if incident is resolved"""
        return self.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]

    def requires_immediate_attention(self) -> bool:
        """Check if incident requires immediate attention"""
        return (
            self.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL] and
            self.status == IncidentStatus.REPORTED
        )

    def get_severity_color(self) -> str:
        """Get color code for severity level"""
        colors = {
            SeverityLevel.LOW: "#22c55e",      # Green
            SeverityLevel.MEDIUM: "#f59e0b",   # Yellow
            SeverityLevel.HIGH: "#f97316",     # Orange
            SeverityLevel.CRITICAL: "#dc2626"  # Red
        }
        return colors.get(self.severity, "#6b7280")

    def to_geojson_feature(self) -> dict:
        """Convert to GeoJSON feature"""
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [self.longitude, self.latitude]
            },
            "properties": {
                "id": self.id,
                "title": self.title,
                "description": self.description,
                "incident_type": self.incident_type.value,
                "severity": self.severity.value,
                "status": self.status.value,
                "affected_people_count": self.affected_people_count,
                "water_level": self.water_level,
                "image_url": self.image_url,
                "address": self.address,
                "landmark": self.landmark,
                "reporter_id": self.reporter_id,
                "assigned_unit_id": self.assigned_unit_id,
                "created_at": self.created_at.isoformat() if self.created_at else None,
                "updated_at": self.updated_at.isoformat() if self.updated_at else None,
                "color": self.get_severity_color()
            }
        }

    def __repr__(self):
        return f"<Incident(id={self.id}, type='{self.incident_type}', severity='{self.severity}')>"
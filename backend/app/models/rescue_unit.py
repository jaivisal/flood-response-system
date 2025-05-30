"""
Rescue Unit model for emergency response teams
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geography
import enum

from app.database import Base


class UnitType(str, enum.Enum):
    """Unit types"""
    FIRE_RESCUE = "fire_rescue"
    MEDICAL = "medical"
    WATER_RESCUE = "water_rescue"
    EVACUATION = "evacuation"
    SEARCH_RESCUE = "search_rescue"
    POLICE = "police"
    EMERGENCY_SERVICES = "emergency_services"
    VOLUNTEER = "volunteer"


class UnitStatus(str, enum.Enum):
    """Unit status"""
    AVAILABLE = "available"
    BUSY = "busy"
    EN_ROUTE = "en_route"
    ON_SCENE = "on_scene"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


class RescueUnit(Base):
    """Rescue Unit model"""
    __tablename__ = "rescue_units"

    id = Column(Integer, primary_key=True, index=True)
    unit_name = Column(String, nullable=False, unique=True)
    call_sign = Column(String, nullable=True)
    unit_type = Column(Enum(UnitType), nullable=False)
    status = Column(Enum(UnitStatus), nullable=False, default=UnitStatus.AVAILABLE)
    
    # Location data (PostGIS)
    location = Column(Geography('POINT', srid=4326), nullable=False)
    base_location = Column(Geography('POINT', srid=4326), nullable=True)  # Home base
    current_address = Column(String, nullable=True)
    
    # Unit details
    capacity = Column(Integer, default=4)  # Number of people unit can handle
    equipment = Column(Text, nullable=True)  # JSON array of equipment
    contact_number = Column(String, nullable=True)
    radio_frequency = Column(String, nullable=True)
    
    # Personnel
    team_leader = Column(String, nullable=True)
    team_size = Column(Integer, default=2)
    
    # Operational data
    fuel_level = Column(Float, nullable=True)  # Percentage
    last_maintenance = Column(DateTime(timezone=True), nullable=True)
    next_maintenance = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_location_update = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assigned_incidents = relationship("Incident", back_populates="assigned_unit")

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

    def is_available(self) -> bool:
        """Check if unit is available for assignment"""
        return self.status == UnitStatus.AVAILABLE

    def is_active(self) -> bool:
        """Check if unit is currently active"""
        return self.status not in [UnitStatus.OFFLINE, UnitStatus.MAINTENANCE]

    def needs_maintenance(self) -> bool:
        """Check if unit needs maintenance"""
        from datetime import datetime
        if self.next_maintenance:
            return datetime.now() >= self.next_maintenance
        return False

    def get_status_color(self) -> str:
        """Get color code for unit status"""
        colors = {
            UnitStatus.AVAILABLE: "#22c55e",    # Green
            UnitStatus.BUSY: "#f59e0b",         # Yellow
            UnitStatus.EN_ROUTE: "#3b82f6",     # Blue
            UnitStatus.ON_SCENE: "#8b5cf6",     # Purple
            UnitStatus.OFFLINE: "#6b7280",      # Gray
            UnitStatus.MAINTENANCE: "#dc2626"   # Red
        }
        return colors.get(self.status, "#6b7280")

    def get_type_icon(self) -> str:
        """Get icon for unit type"""
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
        return icons.get(self.unit_type, "🚨")

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
                "unit_name": self.unit_name,
                "call_sign": self.call_sign,
                "unit_type": self.unit_type.value,
                "status": self.status.value,
                "capacity": self.capacity,
                "team_size": self.team_size,
                "team_leader": self.team_leader,
                "contact_number": self.contact_number,
                "radio_frequency": self.radio_frequency,
                "fuel_level": self.fuel_level,
                "current_address": self.current_address,
                "last_location_update": self.last_location_update.isoformat() if self.last_location_update else None,
                "color": self.get_status_color(),
                "icon": self.get_type_icon(),
                "is_available": self.is_available(),
                "needs_maintenance": self.needs_maintenance()
            }
        }

    def __repr__(self):
        return f"<RescueUnit(name='{self.unit_name}', type='{self.unit_type}', status='{self.status}')>"
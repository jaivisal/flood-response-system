"""
Enhanced Incident model with better GIS support and additional fields
backend/app/models/incident.py - UPDATED VERSION
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, Float, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geography
import enum
from datetime import datetime, timedelta
import json

from app.database import Base


class IncidentType(str, enum.Enum):
    """Enhanced incident types with display names"""
    FLOOD = "flood"
    RESCUE_NEEDED = "rescue_needed"
    INFRASTRUCTURE_DAMAGE = "infrastructure_damage"
    ROAD_CLOSURE = "road_closure"
    POWER_OUTAGE = "power_outage"
    WATER_CONTAMINATION = "water_contamination"
    EVACUATION_REQUIRED = "evacuation_required"
    MEDICAL_EMERGENCY = "medical_emergency"
    FIRE = "fire"
    LANDSLIDE = "landslide"
    CHEMICAL_SPILL = "chemical_spill"
    BUILDING_COLLAPSE = "building_collapse"
    OTHER = "other"

    @property
    def display_name(self):
        """Get human-readable incident type name"""
        names = {
            "flood": "Flood",
            "rescue_needed": "Rescue Needed",
            "infrastructure_damage": "Infrastructure Damage",
            "road_closure": "Road Closure",
            "power_outage": "Power Outage",
            "water_contamination": "Water Contamination",
            "evacuation_required": "Evacuation Required",
            "medical_emergency": "Medical Emergency",
            "fire": "Fire",
            "landslide": "Landslide",
            "chemical_spill": "Chemical Spill",
            "building_collapse": "Building Collapse",
            "other": "Other"
        }
        return names.get(self.value, self.value.replace('_', ' ').title())

    @property
    def icon(self):
        """Get emoji icon for incident type"""
        icons = {
            "flood": "🌊",
            "rescue_needed": "🆘",
            "infrastructure_damage": "🏗️",
            "road_closure": "🚧",
            "power_outage": "⚡",
            "water_contamination": "💧",
            "evacuation_required": "🚨",
            "medical_emergency": "🏥",
            "fire": "🔥",
            "landslide": "⛰️",
            "chemical_spill": "☢️",
            "building_collapse": "🏢",
            "other": "❗"
        }
        return icons.get(self.value, "📍")


class SeverityLevel(str, enum.Enum):
    """Enhanced severity levels with numeric values"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    @property
    def numeric_value(self):
        """Get numeric value for sorting and calculations"""
        values = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        return values.get(self.value, 0)

    @property
    def color(self):
        """Get color code for severity level"""
        colors = {
            "low": "#22c55e",      # Green
            "medium": "#f59e0b",   # Yellow
            "high": "#f97316",     # Orange
            "critical": "#dc2626"  # Red
        }
        return colors.get(self.value, "#6b7280")

    @property
    def background_color(self):
        """Get background color for UI elements"""
        colors = {
            "low": "#f0fdf4",      # Green background
            "medium": "#fffbeb",   # Yellow background
            "high": "#fff7ed",     # Orange background
            "critical": "#fef2f2"  # Red background
        }
        return colors.get(self.value, "#f9fafb")


class IncidentStatus(str, enum.Enum):
    """Enhanced incident status with workflow support"""
    REPORTED = "reported"
    VERIFIED = "verified"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    CANCELLED = "cancelled"

    @property
    def display_name(self):
        """Get human-readable status name"""
        names = {
            "reported": "Reported",
            "verified": "Verified",
            "assigned": "Assigned",
            "in_progress": "In Progress",
            "resolved": "Resolved",
            "closed": "Closed",
            "cancelled": "Cancelled"
        }
        return names.get(self.value, self.value.replace('_', ' ').title())

    @property
    def color(self):
        """Get color code for status"""
        colors = {
            "reported": "#f59e0b",     # Yellow
            "verified": "#3b82f6",     # Blue
            "assigned": "#8b5cf6",     # Purple
            "in_progress": "#f97316",  # Orange
            "resolved": "#22c55e",     # Green
            "closed": "#6b7280",       # Gray
            "cancelled": "#ef4444"     # Red
        }
        return colors.get(self.value, "#6b7280")

    def can_transition_to(self, new_status: 'IncidentStatus') -> bool:
        """Check if status can transition to new status"""
        transitions = {
            self.REPORTED: [self.VERIFIED, self.ASSIGNED, self.CANCELLED],
            self.VERIFIED: [self.ASSIGNED, self.CANCELLED],
            self.ASSIGNED: [self.IN_PROGRESS, self.REPORTED, self.CANCELLED],
            self.IN_PROGRESS: [self.RESOLVED, self.ASSIGNED],
            self.RESOLVED: [self.CLOSED, self.IN_PROGRESS],
            self.CLOSED: [],  # Terminal state
            self.CANCELLED: []  # Terminal state
        }
        return new_status in transitions.get(self, [])


class Incident(Base):
    """Enhanced Incident model with comprehensive tracking"""
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic information
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    incident_type = Column(Enum(IncidentType), nullable=False, index=True)
    severity = Column(Enum(SeverityLevel), nullable=False, default=SeverityLevel.MEDIUM, index=True)
    status = Column(Enum(IncidentStatus), nullable=False, default=IncidentStatus.REPORTED, index=True)
    
    # Location data (Enhanced with PostGIS)
    location = Column(Geography('POINT', srid=4326), nullable=False, index=True)
    address = Column(String(500), nullable=True)
    landmark = Column(String(200), nullable=True)
    location_accuracy = Column(Float, nullable=True)  # GPS accuracy in meters
    
    # Impact assessment
    affected_people_count = Column(Integer, default=0)
    estimated_damage_cost = Column(Float, nullable=True)  # In local currency
    affected_area_sqkm = Column(Float, nullable=True)
    
    # Environmental data
    water_level = Column(Float, nullable=True)  # Water level in meters
    water_flow_rate = Column(Float, nullable=True)  # Flow rate in cubic meters per second
    wind_speed = Column(Float, nullable=True)  # Wind speed in km/h
    temperature = Column(Float, nullable=True)  # Temperature in Celsius
    
    # Media and documentation
    image_url = Column(String(500), nullable=True)
    additional_images = Column(JSON, nullable=True)  # Array of image URLs
    video_urls = Column(JSON, nullable=True)  # Array of video URLs
    documents = Column(JSON, nullable=True)  # Array of document URLs
    
    # Assignment and tracking
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_unit_id = Column(Integer, ForeignKey("rescue_units.id"), nullable=True, index=True)
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Priority and urgency
    priority_score = Column(Integer, default=0)  # Calculated priority score
    is_mass_casualty = Column(Boolean, default=False)
    is_hazmat_involved = Column(Boolean, default=False)
    is_structural_damage = Column(Boolean, default=False)
    
    # Response tracking
    estimated_response_time = Column(Integer, nullable=True)  # Minutes
    actual_response_time = Column(Integer, nullable=True)  # Minutes
    resolution_time = Column(Integer, nullable=True)  # Minutes from creation to resolution
    
    # Contact information
    reporter_phone = Column(String(20), nullable=True)
    reporter_name = Column(String(100), nullable=True)
    on_scene_contact = Column(String(20), nullable=True)
    
    # Weather and environmental conditions
    weather_conditions = Column(String(100), nullable=True)
    visibility = Column(String(50), nullable=True)  # Good, Poor, Limited
    road_conditions = Column(String(100), nullable=True)
    
    # Additional metadata
    external_incident_id = Column(String(100), nullable=True)  # External system reference
    source_system = Column(String(50), nullable=True)  # Where the incident came from
    tags = Column(JSON, nullable=True)  # Flexible tagging system
    notes = Column(JSON, nullable=True)  # Array of timestamped notes
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    verified_at = Column(DateTime(timezone=True), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    response_started_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reported_incidents")
    assigned_unit = relationship("RescueUnit", back_populates="assigned_incidents")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])

    # Properties for frontend compatibility
    @property
    def latitude(self) -> float:
        """Get latitude from location"""
        if self.location:
            return float(self.location.latitude)
        return 0.0

    @property
    def longitude(self) -> float:
        """Get longitude from location"""
        if self.location:
            return float(self.location.longitude)
        return 0.0

    @property
    def coordinates(self) -> tuple:
        """Get coordinates as (lat, lng) tuple"""
        return (self.latitude, self.longitude)

    @property
    def is_critical(self) -> bool:
        """Check if incident is critical"""
        return (
            self.severity == SeverityLevel.CRITICAL or
            self.is_mass_casualty or
            self.affected_people_count > 50 or
            self.priority_score > 80
        )

    @property
    def is_resolved(self) -> bool:
        """Check if incident is resolved"""
        return self.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]

    @property
    def requires_immediate_attention(self) -> bool:
        """Check if incident requires immediate attention"""
        return (
            self.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL] and
            self.status == IncidentStatus.REPORTED and
            not self.assigned_unit_id
        )

    @property
    def is_overdue(self) -> bool:
        """Check if incident response is overdue"""
        if self.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
            return False
        
        hours_since_creation = (datetime.utcnow() - self.created_at).total_seconds() / 3600
        
        # Define SLA based on severity
        sla_hours = {
            SeverityLevel.CRITICAL: 1,
            SeverityLevel.HIGH: 4,
            SeverityLevel.MEDIUM: 12,
            SeverityLevel.LOW: 24
        }
        
        return hours_since_creation > sla_hours.get(self.severity, 24)

    def calculate_priority_score(self) -> int:
        """Calculate priority score based on multiple factors"""
        score = 0
        
        # Severity weight (40%)
        severity_weights = {
            SeverityLevel.LOW: 10,
            SeverityLevel.MEDIUM: 30,
            SeverityLevel.HIGH: 60,
            SeverityLevel.CRITICAL: 100
        }
        score += severity_weights.get(self.severity, 0) * 0.4
        
        # Affected people weight (30%)
        if self.affected_people_count > 100:
            score += 30
        elif self.affected_people_count > 50:
            score += 25
        elif self.affected_people_count > 20:
            score += 20
        elif self.affected_people_count > 10:
            score += 15
        elif self.affected_people_count > 0:
            score += 10
        
        # Age of incident weight (20%)
        hours_old = (datetime.utcnow() - self.created_at).total_seconds() / 3600
        if hours_old > 24:
            score += 20
        elif hours_old > 12:
            score += 15
        elif hours_old > 6:
            score += 10
        elif hours_old > 2:
            score += 5
        
        # Special conditions weight (10%)
        if self.is_mass_casualty:
            score += 5
        if self.is_hazmat_involved:
            score += 3
        if self.is_structural_damage:
            score += 2
        
        return min(int(score), 100)

    def update_priority_score(self):
        """Update the priority score"""
        self.priority_score = self.calculate_priority_score()

    def get_severity_color(self) -> str:
        """Get color code for severity level"""
        return self.severity.color

    def get_status_color(self) -> str:
        """Get color code for status"""
        return self.status.color

    def add_note(self, note: str, user_id: int):
        """Add a timestamped note to the incident"""
        if not self.notes:
            self.notes = []
        
        new_note = {
            "id": len(self.notes) + 1,
            "note": note,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.notes.append(new_note)

    def update_status(self, new_status: IncidentStatus, user_id: int = None):
        """Update incident status with validation and timestamps"""
        if not self.status.can_transition_to(new_status):
            raise ValueError(f"Cannot transition from {self.status.value} to {new_status.value}")
        
        old_status = self.status
        self.status = new_status
        
        # Update relevant timestamps
        now = datetime.utcnow()
        if new_status == IncidentStatus.VERIFIED:
            self.verified_at = now
            if user_id:
                self.verified_by_id = user_id
        elif new_status == IncidentStatus.ASSIGNED:
            self.assigned_at = now
            if user_id:
                self.assigned_by_id = user_id
        elif new_status == IncidentStatus.IN_PROGRESS:
            self.response_started_at = now
        elif new_status == IncidentStatus.RESOLVED:
            self.resolved_at = now
            if self.created_at:
                self.resolution_time = int((now - self.created_at).total_seconds() / 60)
        elif new_status == IncidentStatus.CLOSED:
            self.closed_at = now
        
        # Add status change note
        if user_id:
            self.add_note(f"Status changed from {old_status.display_name} to {new_status.display_name}", user_id)

    def calculate_response_time(self) -> int:
        """Calculate actual response time in minutes"""
        if self.response_started_at and self.created_at:
            return int((self.response_started_at - self.created_at).total_seconds() / 60)
        return 0

    def to_geojson_feature(self) -> dict:
        """Convert to GeoJSON feature for mapping"""
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
                "incident_type_display": self.incident_type.display_name,
                "incident_type_icon": self.incident_type.icon,
                "severity": self.severity.value,
                "severity_display": self.severity.display_name,
                "severity_color": self.severity.color,
                "status": self.status.value,
                "status_display": self.status.display_name,
                "status_color": self.status.color,
                "affected_people_count": self.affected_people_count,
                "water_level": self.water_level,
                "image_url": self.image_url,
                "address": self.address,
                "landmark": self.landmark,
                "reporter_id": self.reporter_id,
                "assigned_unit_id": self.assigned_unit_id,
                "priority_score": self.priority_score,
                "is_critical": self.is_critical,
                "is_overdue": self.is_overdue,
                "requires_immediate_attention": self.requires_immediate_attention,
                "created_at": self.created_at.isoformat() if self.created_at else None,
                "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            }
        }

    def to_dict(self) -> dict:
        """Convert incident to dictionary for API responses"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "incident_type": self.incident_type.value,
            "incident_type_display": self.incident_type.display_name,
            "incident_type_icon": self.incident_type.icon,
            "severity": self.severity.value,
            "severity_display": self.severity.display_name,
            "severity_color": self.severity.color,
            "status": self.status.value,
            "status_display": self.status.display_name,
            "status_color": self.status.color,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "coordinates": self.coordinates,
            "address": self.address,
            "landmark": self.landmark,
            "affected_people_count": self.affected_people_count,
            "water_level": self.water_level,
            "image_url": self.image_url,
            "additional_images": self.additional_images,
            "reporter_id": self.reporter_id,
            "assigned_unit_id": self.assigned_unit_id,
            "priority_score": self.priority_score,
            "is_critical": self.is_critical,
            "is_resolved": self.is_resolved,
            "is_overdue": self.is_overdue,
            "requires_immediate_attention": self.requires_immediate_attention,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolution_time": self.resolution_time,
            "response_time": self.calculate_response_time(),
        }

    def __repr__(self):
        return f"<Incident(id={self.id}, type='{self.incident_type.value}', severity='{self.severity.value}', status='{self.status.value}')>"
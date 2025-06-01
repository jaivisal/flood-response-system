"""
Enhanced Rescue Unit model with better tracking and management
backend/app/models/rescue_unit.py - UPDATED VERSION
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Enum, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geography
import enum
from datetime import datetime, timedelta
import json

from app.database import Base


class UnitType(str, enum.Enum):
    """Enhanced unit types with capabilities"""
    FIRE_RESCUE = "fire_rescue"
    MEDICAL = "medical"
    WATER_RESCUE = "water_rescue"
    EVACUATION = "evacuation"
    SEARCH_RESCUE = "search_rescue"
    POLICE = "police"
    EMERGENCY_SERVICES = "emergency_services"
    VOLUNTEER = "volunteer"
    HAZMAT = "hazmat"
    TECHNICAL_RESCUE = "technical_rescue"

    @property
    def display_name(self):
        """Get human-readable unit type name"""
        names = {
            "fire_rescue": "Fire Rescue",
            "medical": "Medical",
            "water_rescue": "Water Rescue",
            "evacuation": "Evacuation",
            "search_rescue": "Search & Rescue",
            "police": "Police",
            "emergency_services": "Emergency Services",
            "volunteer": "Volunteer",
            "hazmat": "HAZMAT",
            "technical_rescue": "Technical Rescue"
        }
        return names.get(self.value, self.value.replace('_', ' ').title())

    @property
    def icon(self):
        """Get emoji icon for unit type"""
        icons = {
            "fire_rescue": "🚒",
            "medical": "🚑",
            "water_rescue": "🚤",
            "evacuation": "🚐",
            "search_rescue": "🚁",
            "police": "🚓",
            "emergency_services": "🚨",
            "volunteer": "👥",
            "hazmat": "☢️",
            "technical_rescue": "🏗️"
        }
        return icons.get(self.value, "🚨")

    @property
    def capabilities(self):
        """Get list of capabilities for this unit type"""
        capabilities_map = {
            "fire_rescue": ["firefighting", "rescue", "medical_basic", "vehicle_extrication"],
            "medical": ["medical_advanced", "patient_transport", "life_support"],
            "water_rescue": ["water_rescue", "boat_operations", "diving", "swift_water"],
            "evacuation": ["mass_transport", "shelter_operations", "crowd_control"],
            "search_rescue": ["search_operations", "technical_rescue", "wilderness", "urban_search"],
            "police": ["law_enforcement", "traffic_control", "crowd_control", "investigation"],
            "emergency_services": ["coordination", "communications", "logistics"],
            "volunteer": ["support_operations", "logistics", "community_liaison"],
            "hazmat": ["chemical_response", "decontamination", "environmental"],
            "technical_rescue": ["structural_collapse", "rope_rescue", "confined_space"]
        }
        return capabilities_map.get(self.value, [])


class UnitStatus(str, enum.Enum):
    """Enhanced unit status with detailed states"""
    AVAILABLE = "available"
    STANDBY = "standby"
    DISPATCHED = "dispatched"
    EN_ROUTE = "en_route"
    ON_SCENE = "on_scene"
    BUSY = "busy"
    RETURNING = "returning"
    OUT_OF_SERVICE = "out_of_service"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"

    @property
    def display_name(self):
        """Get human-readable status name"""
        names = {
            "available": "Available",
            "standby": "Standby",
            "dispatched": "Dispatched",
            "en_route": "En Route",
            "on_scene": "On Scene",
            "busy": "Busy",
            "returning": "Returning",
            "out_of_service": "Out of Service",
            "maintenance": "Maintenance",
            "offline": "Offline"
        }
        return names.get(self.value, self.value.replace('_', ' ').title())

    @property
    def color(self):
        """Get color code for status"""
        colors = {
            "available": "#22c55e",     # Green
            "standby": "#3b82f6",       # Blue
            "dispatched": "#8b5cf6",    # Purple
            "en_route": "#f59e0b",      # Yellow
            "on_scene": "#f97316",      # Orange
            "busy": "#ef4444",          # Red
            "returning": "#06b6d4",     # Cyan
            "out_of_service": "#6b7280", # Gray
            "maintenance": "#dc2626",   # Dark Red
            "offline": "#374151"        # Dark Gray
        }
        return colors.get(self.value, "#6b7280")

    @property
    def is_operational(self):
        """Check if unit is operational"""
        return self in [
            self.AVAILABLE, self.STANDBY, self.DISPATCHED, 
            self.EN_ROUTE, self.ON_SCENE, self.BUSY, self.RETURNING
        ]

    @property
    def is_available_for_dispatch(self):
        """Check if unit can be dispatched"""
        return self in [self.AVAILABLE, self.STANDBY]


class RescueUnit(Base):
    """Enhanced Rescue Unit model with comprehensive tracking"""
    __tablename__ = "rescue_units"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic information
    unit_name = Column(String(100), nullable=False, unique=True, index=True)
    call_sign = Column(String(20), nullable=True, unique=True)
    unit_number = Column(String(20), nullable=True)
    unit_type = Column(Enum(UnitType), nullable=False, index=True)
    status = Column(Enum(UnitStatus), nullable=False, default=UnitStatus.AVAILABLE, index=True)
    
    # Location data (Enhanced with PostGIS)
    location = Column(Geography('POINT', srid=4326), nullable=False, index=True)
    base_location = Column(Geography('POINT', srid=4326), nullable=True)
    current_address = Column(String(500), nullable=True)
    heading = Column(Float, nullable=True)  # Direction in degrees
    speed = Column(Float, nullable=True)  # Speed in km/h
    location_accuracy = Column(Float, nullable=True)  # GPS accuracy in meters
    
    # Capacity and personnel
    capacity = Column(Integer, default=4)  # Maximum people the unit can handle
    team_size = Column(Integer, default=2)
    team_leader = Column(String(100), nullable=True)
    team_members = Column(JSON, nullable=True)  # Array of team member info
    
    # Contact information
    contact_number = Column(String(20), nullable=True)
    secondary_contact = Column(String(20), nullable=True)
    radio_frequency = Column(String(20), nullable=True)
    backup_radio_frequency = Column(String(20), nullable=True)
    
    # Equipment and capabilities
    equipment = Column(JSON, nullable=True)  # Array of equipment
    specialized_equipment = Column(JSON, nullable=True)  # Special equipment
    capabilities = Column(JSON, nullable=True)  # Array of capabilities
    certifications = Column(JSON, nullable=True)  # Team certifications
    
    # Vehicle information
    vehicle_make = Column(String(50), nullable=True)
    vehicle_model = Column(String(50), nullable=True)
    vehicle_year = Column(Integer, nullable=True)
    license_plate = Column(String(20), nullable=True)
    vin_number = Column(String(50), nullable=True)
    
    # Operational data
    fuel_level = Column(Float, nullable=True)  # Percentage (0-100)
    fuel_capacity = Column(Float, nullable=True)  # Liters
    range_km = Column(Float, nullable=True)  # Operational range in km
    max_speed = Column(Float, nullable=True)  # Maximum speed in km/h
    
    # Maintenance and service
    last_maintenance = Column(DateTime(timezone=True), nullable=True)
    next_maintenance = Column(DateTime(timezone=True), nullable=True)
    maintenance_due_km = Column(Integer, nullable=True)  # Kilometers until maintenance
    current_odometer = Column(Integer, nullable=True)  # Current odometer reading
    service_hours = Column(Float, nullable=True)  # Total service hours
    
    # Deployment tracking
    current_incident_id = Column(Integer, nullable=True)  # Currently assigned incident
    deployment_start = Column(DateTime(timezone=True), nullable=True)
    estimated_return = Column(DateTime(timezone=True), nullable=True)
    total_deployments = Column(Integer, default=0)
    total_service_time = Column(Float, default=0)  # Total hours in service
    
    # Performance metrics
    response_time_avg = Column(Float, nullable=True)  # Average response time in minutes
    success_rate = Column(Float, nullable=True)  # Success rate percentage
    availability_rate = Column(Float, nullable=True)  # Availability percentage
    utilization_rate = Column(Float, nullable=True)  # Utilization percentage
    
    # Administrative
    department = Column(String(100), nullable=True)
    station = Column(String(100), nullable=True)
    cost_per_hour = Column(Float, nullable=True)
    insurance_policy = Column(String(100), nullable=True)
    
    # Status tracking
    is_active = Column(Boolean, default=True)
    is_emergency_capable = Column(Boolean, default=True)
    requires_escort = Column(Boolean, default=False)
    is_tracked = Column(Boolean, default=True)
    
    # Environmental capabilities
    weather_rating = Column(String(50), nullable=True)  # All-weather, Fair-weather, etc.
    water_depth_max = Column(Float, nullable=True)  # Maximum water depth in meters
    terrain_capability = Column(JSON, nullable=True)  # Terrain types
    
    # Emergency features
    emergency_lights = Column(Boolean, default=True)
    siren = Column(Boolean, default=True)
    radio_encryption = Column(Boolean, default=False)
    gps_tracking = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_location_update = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    status_changed_at = Column(DateTime(timezone=True), server_default=func.now())
    last_deployment = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    assigned_incidents = relationship("Incident", back_populates="assigned_unit")

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
    def is_available(self) -> bool:
        """Check if unit is available for assignment"""
        return self.status.is_available_for_dispatch and self.is_active

    @property
    def is_operational(self) -> bool:
        """Check if unit is currently operational"""
        return self.status.is_operational and self.is_active

    @property
    def needs_maintenance(self) -> bool:
        """Check if unit needs maintenance"""
        if not self.next_maintenance:
            return False
        return datetime.utcnow() >= self.next_maintenance

    @property
    def is_overdue_maintenance(self) -> bool:
        """Check if unit is overdue for maintenance"""
        if not self.next_maintenance:
            return False
        return datetime.utcnow() > (self.next_maintenance + timedelta(days=7))

    @property
    def fuel_status(self) -> str:
        """Get fuel status description"""
        if not self.fuel_level:
            return "unknown"
        elif self.fuel_level < 15:
            return "critical"
        elif self.fuel_level < 30:
            return "low"
        elif self.fuel_level < 70:
            return "normal"
        else:
            return "full"

    @property
    def estimated_range_km(self) -> float:
        """Calculate estimated range based on current fuel"""
        if not self.fuel_level or not self.range_km:
            return 0
        return (self.fuel_level / 100) * self.range_km

    def get_status_color(self) -> str:
        """Get color code for unit status"""
        return self.status.color

    def get_type_icon(self) -> str:
        """Get icon for unit type"""
        return self.unit_type.icon

    def update_location(self, latitude: float, longitude: float, accuracy: float = None, 
                       heading: float = None, speed: float = None, address: str = None):
        """Update unit location with optional metadata"""
        from app.services.gis_service import create_point_from_coords
        
        self.location = create_point_from_coords(latitude, longitude)
        self.last_location_update = datetime.utcnow()
        
        if accuracy is not None:
            self.location_accuracy = accuracy
        if heading is not None:
            self.heading = heading
        if speed is not None:
            self.speed = speed
        if address:
            self.current_address = address

    def update_status(self, new_status: UnitStatus, incident_id: int = None):
        """Update unit status with validation and tracking"""
        old_status = self.status
        self.status = new_status
        self.status_changed_at = datetime.utcnow()
        
        # Handle status-specific logic
        if new_status == UnitStatus.DISPATCHED and incident_id:
            self.current_incident_id = incident_id
            self.deployment_start = datetime.utcnow()
        elif new_status == UnitStatus.AVAILABLE:
            if self.deployment_start:
                # Calculate deployment time
                deployment_time = (datetime.utcnow() - self.deployment_start).total_seconds() / 3600
                self.total_service_time += deployment_time
            
            self.current_incident_id = None
            self.deployment_start = None
            self.estimated_return = None
        elif new_status == UnitStatus.ON_SCENE:
            self.last_deployment = datetime.utcnow()

    def calculate_distance_to(self, latitude: float, longitude: float) -> float:
        """Calculate distance to a point in kilometers"""
        from app.services.gis_service import calculate_distance
        return calculate_distance(self.latitude, self.longitude, latitude, longitude)

    def estimate_travel_time(self, latitude: float, longitude: float, 
                           emergency: bool = False) -> int:
        """Estimate travel time to a location in minutes"""
        distance = self.calculate_distance_to(latitude, longitude)
        
        # Average speeds based on emergency status and terrain
        if emergency:
            avg_speed = 60  # km/h for emergency response
        else:
            avg_speed = 40  # km/h for normal operations
        
        # Add buffer time for deployment preparation
        travel_time = (distance / avg_speed) * 60  # Convert to minutes
        buffer_time = 5 if emergency else 10  # Minutes
        
        return int(travel_time + buffer_time)

    def can_handle_incident_type(self, incident_type: str) -> bool:
        """Check if unit can handle specific incident type"""
        type_capabilities = {
            "flood": ["water_rescue", "evacuation", "rescue"],
            "rescue_needed": ["rescue", "search_operations", "medical_basic"],
            "medical_emergency": ["medical_advanced", "medical_basic", "patient_transport"],
            "fire": ["firefighting", "rescue", "vehicle_extrication"],
            "infrastructure_damage": ["technical_rescue", "structural_collapse"],
            "evacuation_required": ["mass_transport", "evacuation", "crowd_control"],
            "hazmat": ["chemical_response", "decontamination", "environmental"]
        }
        
        required_capabilities = type_capabilities.get(incident_type, [])
        unit_capabilities = self.capabilities or []
        
        # Check if unit has any of the required capabilities
        return any(cap in unit_capabilities for cap in required_capabilities)

    def update_performance_metrics(self):
        """Update performance metrics based on historical data"""
        # This would typically query historical deployment data
        # For now, we'll update basic metrics
        if self.total_deployments > 0:
            self.utilization_rate = min((self.total_service_time / (24 * 30)) * 100, 100)  # Monthly utilization

    def schedule_maintenance(self, maintenance_date: datetime, maintenance_type: str = "routine"):
        """Schedule maintenance for the unit"""
        self.next_maintenance = maintenance_date
        if maintenance_date <= datetime.utcnow():
            self.status = UnitStatus.MAINTENANCE

    def add_equipment(self, equipment_item: str, quantity: int = 1):
        """Add equipment to the unit"""
        if not self.equipment:
            self.equipment = []
        
        # Check if equipment already exists
        for item in self.equipment:
            if item.get("name") == equipment_item:
                item["quantity"] = item.get("quantity", 1) + quantity
                return
        
        # Add new equipment
        self.equipment.append({
            "name": equipment_item,
            "quantity": quantity,
            "added_date": datetime.utcnow().isoformat()
        })

    def remove_equipment(self, equipment_item: str, quantity: int = 1):
        """Remove equipment from the unit"""
        if not self.equipment:
            return
        
        for item in self.equipment:
            if item.get("name") == equipment_item:
                current_qty = item.get("quantity", 1)
                if current_qty <= quantity:
                    self.equipment.remove(item)
                else:
                    item["quantity"] = current_qty - quantity
                break

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
                "unit_name": self.unit_name,
                "call_sign": self.call_sign,
                "unit_type": self.unit_type.value,
                "unit_type_display": self.unit_type.display_name,
                "unit_type_icon": self.unit_type.icon,
                "status": self.status.value,
                "status_display": self.status.display_name,
                "status_color": self.status.color,
                "capacity": self.capacity,
                "team_size": self.team_size,
                "team_leader": self.team_leader,
                "contact_number": self.contact_number,
                "radio_frequency": self.radio_frequency,
                "fuel_level": self.fuel_level,
                "fuel_status": self.fuel_status,
                "current_address": self.current_address,
                "heading": self.heading,
                "speed": self.speed,
                "is_available": self.is_available,
                "is_operational": self.is_operational,
                "needs_maintenance": self.needs_maintenance,
                "estimated_range_km": self.estimated_range_km,
                "last_location_update": self.last_location_update.isoformat() if self.last_location_update else None,
            }
        }

    def to_dict(self) -> dict:
        """Convert rescue unit to dictionary for API responses"""
        return {
            "id": self.id,
            "unit_name": self.unit_name,
            "call_sign": self.call_sign,
            "unit_number": self.unit_number,
            "unit_type": self.unit_type.value,
            "unit_type_display": self.unit_type.display_name,
            "unit_type_icon": self.unit_type.icon,
            "status": self.status.value,
            "status_display": self.status.display_name,
            "status_color": self.status.color,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "coordinates": self.coordinates,
            "current_address": self.current_address,
            "capacity": self.capacity,
            "team_size": self.team_size,
            "team_leader": self.team_leader,
            "team_members": self.team_members,
            "contact_number": self.contact_number,
            "radio_frequency": self.radio_frequency,
            "equipment": self.equipment,
            "capabilities": self.capabilities,
            "fuel_level": self.fuel_level,
            "fuel_status": self.fuel_status,
            "estimated_range_km": self.estimated_range_km,
            "heading": self.heading,
            "speed": self.speed,
            "is_available": self.is_available,
            "is_operational": self.is_operational,
            "is_active": self.is_active,
            "needs_maintenance": self.needs_maintenance,
            "is_overdue_maintenance": self.is_overdue_maintenance,
            "last_maintenance": self.last_maintenance.isoformat() if self.last_maintenance else None,
            "next_maintenance": self.next_maintenance.isoformat() if self.next_maintenance else None,
            "total_deployments": self.total_deployments,
            "response_time_avg": self.response_time_avg,
            "success_rate": self.success_rate,
            "availability_rate": self.availability_rate,
            "utilization_rate": self.utilization_rate,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_location_update": self.last_location_update.isoformat() if self.last_location_update else None,
        }

    def __repr__(self):
        return f"<RescueUnit(id={self.id}, name='{self.unit_name}', type='{self.unit_type.value}', status='{self.status.value}')>"
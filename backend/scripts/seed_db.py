
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import json
from datetime import datetime, timedelta
from sqlalchemy import func
from geoalchemy2 import Geometry
import random

from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.incident import Incident, IncidentType, SeverityLevel, IncidentStatus
from app.models.rescue_unit import RescueUnit, UnitType, UnitStatus
from app.models.flood_zone import FloodZone, RiskLevel, ZoneType
from app.services.gis_service import create_point_from_coords


def create_demo_users(db: Session):
    """Create demo users for different roles"""
    demo_users = [
        {
            "email": "responder@demo.com",
            "full_name": "John Field Responder",
            "role": UserRole.FIELD_RESPONDER,
            "phone_number": "+91-9876543210",
            "department": "Emergency Response Team Alpha",
            "password": "demo123"
        },
        {
            "email": "command@demo.com",
            "full_name": "Sarah Command Center",
            "role": UserRole.COMMAND_CENTER,
            "phone_number": "+91-9876543211",
            "department": "Emergency Command Center",
            "password": "demo123"
        },
        {
            "email": "officer@demo.com",
            "full_name": "Dr. Kumar District Officer",
            "role": UserRole.DISTRICT_OFFICER,
            "phone_number": "+91-9876543212",
            "department": "Madurai District Office",
            "password": "demo123"
        },
        {
            "email": "admin@demo.com",
            "full_name": "Admin User",
            "role": UserRole.ADMIN,
            "phone_number": "+91-9876543213",
            "department": "System Administration",
            "password": "demo123"
        }
    ]
    
    for user_data in demo_users:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing_user:
            user = User(
                email=user_data["email"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                phone_number=user_data["phone_number"],
                department=user_data["department"],
                is_active=True,
                is_verified=True
            )
            user.set_password(user_data["password"])
            db.add(user)
            print(f"Created user: {user_data['email']}")
    
    db.commit()


def create_demo_flood_zones(db: Session):
    """Create demo flood zones in Madurai area"""
    flood_zones = [
        {
            "name": "Vaigai River Basin - North",
            "description": "Northern section of Vaigai river basin with high flood risk",
            "zone_code": "VRB-N-001",
            "risk_level": RiskLevel.HIGH,
            "zone_type": ZoneType.RESIDENTIAL,
            "center_lat": 9.9300,
            "center_lng": 78.1100,
            "area_sqkm": 15.5,
            "population_estimate": 25000,
            "residential_units": 5000,
            "commercial_units": 200,
            "district": "Madurai",
            "municipality": "Madurai Corporation",
            "responsible_officer": "Dr. Kumar Selvam",
            "emergency_contact": "+91-9876543210",
            "current_water_level": 1.2,
            "max_recorded_water_level": 3.5,
            "is_currently_flooded": False
        },
        {
            "name": "Meenakshi Temple Area",
            "description": "Historic temple area with dense population",
            "zone_code": "MTA-001",
            "risk_level": RiskLevel.MEDIUM,
            "zone_type": ZoneType.COMMERCIAL,
            "center_lat": 9.9195,
            "center_lng": 78.1193,
            "area_sqkm": 3.2,
            "population_estimate": 15000,
            "residential_units": 2000,
            "commercial_units": 800,
            "district": "Madurai",
            "municipality": "Madurai Corporation",
            "responsible_officer": "Ms. Priya Devi",
            "emergency_contact": "+91-9876543211",
            "current_water_level": 0.8,
            "max_recorded_water_level": 2.1,
            "is_currently_flooded": False
        },
        {
            "name": "Thirumalai Industrial Zone",
            "description": "Industrial area with manufacturing units",
            "zone_code": "TIZ-001",
            "risk_level": RiskLevel.VERY_HIGH,
            "zone_type": ZoneType.INDUSTRIAL,
            "center_lat": 9.9400,
            "center_lng": 78.1400,
            "area_sqkm": 8.7,
            "population_estimate": 5000,
            "residential_units": 500,
            "commercial_units": 150,
            "district": "Madurai",
            "municipality": "Madurai Corporation",
            "responsible_officer": "Mr. Ravi Kumar",
            "emergency_contact": "+91-9876543212",
            "current_water_level": 2.1,
            "max_recorded_water_level": 4.2,
            "is_currently_flooded": True,
            "evacuation_recommended": True
        },
        {
            "name": "Alagar Hills Foothills",
            "description": "Residential area near hills with flash flood risk",
            "zone_code": "AHF-001",
            "risk_level": RiskLevel.EXTREME,
            "zone_type": ZoneType.RESIDENTIAL,
            "center_lat": 9.8900,
            "center_lng": 78.0900,
            "area_sqkm": 12.1,
            "population_estimate": 8000,
            "residential_units": 1500,
            "commercial_units": 50,
            "district": "Madurai",
            "municipality": "Madurai Corporation",
            "responsible_officer": "Dr. Anitha Raj",
            "emergency_contact": "+91-9876543213",
            "current_water_level": 3.2,
            "max_recorded_water_level": 5.1,
            "is_currently_flooded": True,
            "evacuation_mandatory": True
        }
    ]
    
    for zone_data in flood_zones:
        existing_zone = db.query(FloodZone).filter(FloodZone.zone_code == zone_data["zone_code"]).first()
        if not existing_zone:
            # Create polygon boundary (simplified as a circle around center point)
            center_point = create_point_from_coords(zone_data["center_lat"], zone_data["center_lng"])
            
            zone = FloodZone(
                name=zone_data["name"],
                description=zone_data["description"],
                zone_code=zone_data["zone_code"],
                risk_level=zone_data["risk_level"],
                zone_type=zone_data["zone_type"],
                zone_boundary=center_point,  # Simplified - in production use actual polygon
                center_point=center_point,
                area_sqkm=zone_data["area_sqkm"],
                population_estimate=zone_data["population_estimate"],
                residential_units=zone_data["residential_units"],
                commercial_units=zone_data["commercial_units"],
                critical_infrastructure=json.dumps(["Hospital", "School", "Police Station"]),
                district=zone_data["district"],
                municipality=zone_data["municipality"],
                responsible_officer=zone_data["responsible_officer"],
                emergency_contact=zone_data["emergency_contact"],
                current_water_level=zone_data["current_water_level"],
                max_recorded_water_level=zone_data["max_recorded_water_level"],
                is_currently_flooded=zone_data["is_currently_flooded"],
                evacuation_recommended=zone_data.get("evacuation_recommended", False),
                evacuation_mandatory=zone_data.get("evacuation_mandatory", False),
                last_assessment=datetime.now()
            )
            db.add(zone)
            print(f"Created flood zone: {zone_data['name']}")
    
    db.commit()


def create_demo_rescue_units(db: Session):
    """Create demo rescue units"""
    rescue_units = [
        {
            "unit_name": "Fire Rescue Alpha-1",
            "call_sign": "FR-A1",
            "unit_type": UnitType.FIRE_RESCUE,
            "status": UnitStatus.AVAILABLE,
            "lat": 9.9252,
            "lng": 78.1198,
            "capacity": 6,
            "team_size": 4,
            "team_leader": "Captain Rajesh",
            "contact_number": "+91-9876540001",
            "radio_frequency": "156.800",
            "current_address": "Fire Station 1, Madurai",
            "fuel_level": 85.0,
            "equipment": ["Fire hoses", "Rescue boat", "Medical kit", "Rope rescue gear"]
        },
        {
            "unit_name": "Medical Response Team-1",
            "call_sign": "MRT-1",
            "unit_type": UnitType.MEDICAL,
            "status": UnitStatus.EN_ROUTE,
            "lat": 9.9100,
            "lng": 78.1300,
            "capacity": 4,
            "team_size": 3,
            "team_leader": "Dr. Meera",
            "contact_number": "+91-9876540002",
            "radio_frequency": "156.825",
            "current_address": "Government Hospital, Madurai",
            "fuel_level": 92.0,
            "equipment": ["Advanced medical kit", "Stretchers", "Oxygen tanks", "Defibrillator"]
        },
        {
            "unit_name": "Water Rescue Beta-2",
            "call_sign": "WR-B2",
            "unit_type": UnitType.WATER_RESCUE,
            "status": UnitStatus.ON_SCENE,
            "lat": 9.9400,
            "lng": 78.1400,
            "capacity": 8,
            "team_size": 5,
            "team_leader": "Inspector Suresh",
            "contact_number": "+91-9876540003",
            "radio_frequency": "156.850",
            "current_address": "Vaigai River Bank",
            "fuel_level": 67.0,
            "equipment": ["Inflatable boats", "Life jackets", "Underwater gear", "Rescue ropes"]
        },
        {
            "unit_name": "Evacuation Unit Delta-1",
            "call_sign": "EU-D1",
            "unit_type": UnitType.EVACUATION,
            "status": UnitStatus.BUSY,
            "lat": 9.8900,
            "lng": 78.0900,
            "capacity": 20,
            "team_size": 6,
            "team_leader": "Sergeant Kumar",
            "contact_number": "+91-9876540004",
            "radio_frequency": "156.875",
            "current_address": "Alagar Hills Area",
            "fuel_level": 45.0,
            "equipment": ["Large transport vehicle", "Emergency supplies", "Communication gear"]
        },
        {
            "unit_name": "Search & Rescue Gamma-1",
            "call_sign": "SR-G1",
            "unit_type": UnitType.SEARCH_RESCUE,
            "status": UnitStatus.AVAILABLE,
            "lat": 9.9200,
            "lng": 78.1100,
            "capacity": 4,
            "team_size": 4,
            "team_leader": "Captain Devi",
            "contact_number": "+91-9876540005",
            "radio_frequency": "156.900",
            "current_address": "Emergency Response Base",
            "fuel_level": 88.0,
            "equipment": ["Search equipment", "Rescue dogs", "Thermal cameras", "GPS devices"]
        },
        {
            "unit_name": "Police Emergency Unit-3",
            "call_sign": "PEU-3",
            "unit_type": UnitType.POLICE,
            "status": UnitStatus.MAINTENANCE,
            "lat": 9.9180,
            "lng": 78.1250,
            "capacity": 8,
            "team_size": 4,
            "team_leader": "Inspector Lakshmi",
            "contact_number": "+91-9876540006",
            "radio_frequency": "156.925",
            "current_address": "Police Station Central",
            "fuel_level": 30.0,
            "equipment": ["Communication equipment", "Crowd control gear", "Emergency lighting"]
        }
    ]
    
    for unit_data in rescue_units:
        existing_unit = db.query(RescueUnit).filter(RescueUnit.unit_name == unit_data["unit_name"]).first()
        if not existing_unit:
            location_point = create_point_from_coords(unit_data["lat"], unit_data["lng"])
            
            unit = RescueUnit(
                unit_name=unit_data["unit_name"],
                call_sign=unit_data["call_sign"],
                unit_type=unit_data["unit_type"],
                status=unit_data["status"],
                location=location_point,
                capacity=unit_data["capacity"],
                team_size=unit_data["team_size"],
                team_leader=unit_data["team_leader"],
                contact_number=unit_data["contact_number"],
                radio_frequency=unit_data["radio_frequency"],
                current_address=unit_data["current_address"],
                fuel_level=unit_data["fuel_level"],
                equipment=json.dumps(unit_data["equipment"]),
                last_location_update=datetime.now()
            )
            db.add(unit)
            print(f"Created rescue unit: {unit_data['unit_name']}")
    
    db.commit()


def create_demo_incidents(db: Session):
    """Create demo incidents"""
    # Get some users and units for foreign keys
    users = db.query(User).all()
    units = db.query(RescueUnit).all()
    
    if not users:
        print("No users found. Please create users first.")
        return
    
    incidents = [
        {
            "title": "Severe flooding in residential area",
            "description": "Heavy rainfall has caused severe flooding in the northern residential district. Multiple houses are affected and residents need immediate evacuation.",
            "incident_type": IncidentType.FLOOD,
            "severity": SeverityLevel.CRITICAL,
            "status": IncidentStatus.ASSIGNED,
            "lat": 9.9300,
            "lng": 78.1100,
            "address": "Residential Area, North Madurai",
            "landmark": "Near Government School",
            "affected_people_count": 45,
            "water_level": 2.5,
            "assigned_unit_id": units[0].id if units else None
        },
        {
            "title": "Road closure due to waterlogging",
            "description": "Main road connecting to the city center is completely waterlogged and impassable.",
            "incident_type": IncidentType.ROAD_CLOSURE,
            "severity": SeverityLevel.HIGH,
            "status": IncidentStatus.IN_PROGRESS,
            "lat": 9.9250,
            "lng": 78.1200,
            "address": "Main Road, City Center",
            "landmark": "Near Bus Stand",
            "affected_people_count": 200,
            "water_level": 1.8,
            "assigned_unit_id": units[1].id if len(units) > 1 else None
        },
        {
            "title": "Medical emergency - elderly person trapped",
            "description": "Elderly person with mobility issues trapped in flooded house, requires immediate medical attention.",
            "incident_type": IncidentType.MEDICAL_EMERGENCY,
            "severity": SeverityLevel.CRITICAL,
            "status": IncidentStatus.REPORTED,
            "lat": 9.9180,
            "lng": 78.1150,
            "address": "Old City Area",
            "landmark": "Near Meenakshi Temple",
            "affected_people_count": 1,
            "water_level": 1.2
        },
        {
            "title": "Power outage in industrial zone",
            "description": "Complete power failure in the industrial zone due to flooding of electrical infrastructure.",
            "incident_type": IncidentType.POWER_OUTAGE,
            "severity": SeverityLevel.HIGH,
            "status": IncidentStatus.ASSIGNED,
            "lat": 9.9400,
            "lng": 78.1400,
            "address": "Industrial Zone, Thirumalai",
            "landmark": "Near Manufacturing Complex",
            "affected_people_count": 300,
            "water_level": 2.1,
            "assigned_unit_id": units[2].id if len(units) > 2 else None
        },
        {
            "title": "Evacuation required - dam overflow warning",
            "description": "Dam authorities have issued overflow warning. Immediate evacuation of downstream areas required.",
            "incident_type": IncidentType.EVACUATION_REQUIRED,
            "severity": SeverityLevel.CRITICAL,
            "status": IncidentStatus.IN_PROGRESS,
            "lat": 9.8900,
            "lng": 78.0900,
            "address": "Alagar Hills Foothills",
            "landmark": "Downstream from Dam",
            "affected_people_count": 500,
            "water_level": 3.2,
            "assigned_unit_id": units[3].id if len(units) > 3 else None
        },
        {
            "title": "Infrastructure damage - bridge collapse risk",
            "description": "Old bridge showing signs of structural damage due to flood pressure. Risk of collapse.",
            "incident_type": IncidentType.INFRASTRUCTURE_DAMAGE,
            "severity": SeverityLevel.HIGH,
            "status": IncidentStatus.REPORTED,
            "lat": 9.9100,
            "lng": 78.1300,
            "address": "Old Bridge, Vaigai River",
            "landmark": "Historical Bridge",
            "affected_people_count": 100,
            "water_level": 2.8
        },
        {
            "title": "Water contamination alert",
            "description": "Flood water has contaminated the main water supply. Risk of waterborne diseases.",
            "incident_type": IncidentType.WATER_CONTAMINATION,
            "severity": SeverityLevel.MEDIUM,
            "status": IncidentStatus.RESOLVED,
            "lat": 9.9220,
            "lng": 78.1180,
            "address": "Water Treatment Plant Area",
            "landmark": "Near Treatment Facility",
            "affected_people_count": 1000,
            "water_level": 1.5,
            "resolved_at": datetime.now() - timedelta(hours=2)
        }
    ]
    
    for i, incident_data in enumerate(incidents):
        reporter = users[i % len(users)]  # Rotate through available users
        
        location_point = create_point_from_coords(incident_data["lat"], incident_data["lng"])
        
        incident = Incident(
            title=incident_data["title"],
            description=incident_data["description"],
            incident_type=incident_data["incident_type"],
            severity=incident_data["severity"],
            status=incident_data["status"],
            location=location_point,
            address=incident_data["address"],
            landmark=incident_data["landmark"],
            affected_people_count=incident_data["affected_people_count"],
            water_level=incident_data["water_level"],
            reporter_id=reporter.id,
            assigned_unit_id=incident_data.get("assigned_unit_id"),
            resolved_at=incident_data.get("resolved_at"),
            created_at=datetime.now() - timedelta(hours=random.randint(1, 24))
        )
        db.add(incident)
        print(f"Created incident: {incident_data['title']}")
    
    db.commit()


def seed_database():
    """Main function to seed the database"""
    print("🌱 Starting database seeding...")
    
    db = SessionLocal()
    try:
        print("👥 Creating demo users...")
        create_demo_users(db)
        
        print("🏘️ Creating demo flood zones...")
        create_demo_flood_zones(db)
        
        print("🚒 Creating demo rescue units...")
        create_demo_rescue_units(db)
        
        print("🚨 Creating demo incidents...")
        create_demo_incidents(db)
        
        print("✅ Database seeding completed successfully!")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
"""
Database seeding script for Emergency Flood Response System
Creates demo data for testing and development
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import json
from datetime import datetime, timedelta
from sqlalchemy import func, text
from sqlalchemy.exc import SQLAlchemyError
from geoalchemy2 import Geography
import random
import logging

from app.database import SessionLocal, engine, Base, test_connection, check_postgis
from app.models.user import User, UserRole
from app.models.incident import Incident, IncidentType, SeverityLevel, IncidentStatus
from app.models.rescue_unit import RescueUnit, UnitType, UnitStatus
from app.models.flood_zone import FloodZone, RiskLevel, ZoneType
from app.services.gis_service import create_point_from_coords

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_database_connection():
    """Check database connection and setup"""
    logger.info("🔍 Checking database connection...")
    
    if not test_connection():
        logger.error("❌ Database connection failed!")
        return False
    
    logger.info("✅ Database connection successful")
    
    # Check PostGIS
    if check_postgis():
        logger.info("✅ PostGIS extension available")
    else:
        logger.warning("⚠️ PostGIS extension not available")
    
    return True


def create_demo_users(db):
    """Create demo users for different roles"""
    logger.info("👥 Creating demo users...")
    
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
    
    created_count = 0
    
    for user_data in demo_users:
        try:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if existing_user:
                logger.info(f"User {user_data['email']} already exists")
                
                # Verify and reset password if needed
                if not existing_user.verify_password(user_data["password"]):
                    existing_user.set_password(user_data["password"])
                    db.commit()
                    logger.info(f"  🔄 Password reset for {user_data['email']}")
                
                continue
            
            # Create new user
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
            db.commit()
            db.refresh(user)
            
            logger.info(f"✅ Created user: {user_data['email']}")
            created_count += 1
            
        except SQLAlchemyError as e:
            logger.error(f"❌ Error creating user {user_data['email']}: {e}")
            db.rollback()
    
    return created_count


def create_demo_flood_zones(db):
    """Create demo flood zones"""
    logger.info("🌊 Creating demo flood zones...")
    
    demo_zones = [
        {
            "name": "Vaigai River Basin - North",
            "description": "Northern section of Vaigai river basin with high flood risk during monsoon",
            "zone_code": "VRB-N-001",
            "risk_level": RiskLevel.HIGH,
            "zone_type": ZoneType.RESIDENTIAL,
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
        },
        {
            "name": "Central Commercial District",
            "description": "Main commercial area prone to waterlogging",
            "zone_code": "CCD-001",
            "risk_level": RiskLevel.MEDIUM,
            "zone_type": ZoneType.COMMERCIAL,
            "center_latitude": 9.9195,
            "center_longitude": 78.1278,
            "area_sqkm": 8.2,
            "population_estimate": 15000,
            "residential_units": 2000,
            "commercial_units": 800,
            "district": "Madurai",
            "municipality": "Madurai Corporation",
            "responsible_officer": "Mrs. Priya Nair",
            "emergency_contact": "+91-9876543211",
            "critical_infrastructure": ["Shopping Mall", "Bus Station", "Bank", "Market"]
        },
        {
            "name": "Meenakshi Temple Area",
            "description": "Heritage zone requiring special flood protection measures",
            "zone_code": "MTA-001",
            "risk_level": RiskLevel.VERY_HIGH,
            "zone_type": ZoneType.MIXED,
            "center_latitude": 9.9195,
            "center_longitude": 78.1196,
            "area_sqkm": 3.7,
            "population_estimate": 8000,
            "residential_units": 1200,
            "commercial_units": 300,
            "district": "Madurai",
            "municipality": "Madurai Corporation",
            "responsible_officer": "Dr. Arjun Kumar",
            "emergency_contact": "+91-9876543212",
            "critical_infrastructure": ["Meenakshi Temple", "Heritage Hotel", "Tourist Center"]
        },
        {
            "name": "Industrial Area - East",
            "description": "Industrial zone with chemical storage facilities",
            "zone_code": "IA-E-001",
            "risk_level": RiskLevel.HIGH,
            "zone_type": ZoneType.INDUSTRIAL,
            "center_latitude": 9.9100,
            "center_longitude": 78.1350,
            "area_sqkm": 12.3,
            "population_estimate": 5000,
            "residential_units": 800,
            "commercial_units": 150,
            "district": "Madurai",
            "municipality": "Madurai Corporation",
            "responsible_officer": "Eng. Ravi Shankar",
            "emergency_contact": "+91-9876543214",
            "critical_infrastructure": ["Chemical Plant", "Power Substation", "Warehouse Complex"]
        }
    ]
    
    created_count = 0
    
    for zone_data in demo_zones:
        try:
            # Check if zone already exists
            existing_zone = db.query(FloodZone).filter(FloodZone.zone_code == zone_data["zone_code"]).first()
            if existing_zone:
                logger.info(f"Flood zone {zone_data['zone_code']} already exists")
                continue
            
            # Create flood zone
            zone = FloodZone(
                name=zone_data["name"],
                description=zone_data["description"],
                zone_code=zone_data["zone_code"],
                risk_level=zone_data["risk_level"],
                zone_type=zone_data["zone_type"],
                center_latitude=zone_data["center_latitude"],
                center_longitude=zone_data["center_longitude"],
                area_sqkm=zone_data["area_sqkm"],
                population_estimate=zone_data["population_estimate"],
                residential_units=zone_data["residential_units"],
                commercial_units=zone_data["commercial_units"],
                district=zone_data["district"],
                municipality=zone_data["municipality"],
                responsible_officer=zone_data["responsible_officer"],
                emergency_contact=zone_data["emergency_contact"]
            )
            
            # Set critical infrastructure
            zone.set_critical_infrastructure_list(zone_data["critical_infrastructure"])
            
            # Create center point geometry
            try:
                zone.center_point = func.ST_GeogFromText(
                    f'POINT({zone_data["center_longitude"]} {zone_data["center_latitude"]})'
                )
            except Exception as e:
                logger.warning(f"Could not create geometry for zone {zone_data['zone_code']}: {e}")
            
            db.add(zone)
            db.commit()
            db.refresh(zone)
            
            logger.info(f"✅ Created flood zone: {zone_data['name']}")
            created_count += 1
            
        except SQLAlchemyError as e:
            logger.error(f"❌ Error creating flood zone {zone_data['zone_code']}: {e}")
            db.rollback()
    
    return created_count


def create_demo_rescue_units(db):
    """Create demo rescue units"""
    logger.info("🚨 Creating demo rescue units...")
    
    demo_units = [
        {
            "unit_name": "Fire Rescue Alpha-1",
            "call_sign": "FR-A1",
            "unit_type": UnitType.FIRE_RESCUE,
            "status": UnitStatus.AVAILABLE,
            "latitude": 9.9300,
            "longitude": 78.1150,
            "current_address": "Fire Station 1, Anna Nagar, Madurai",
            "capacity": 6,
            "team_leader": "Captain Rajesh Kumar",
            "team_size": 4,
            "contact_number": "+91-9876001001",
            "radio_frequency": "156.800",
            "fuel_level": 85.0,
            "equipment": ["Fire hoses", "Ladder truck", "Rescue tools", "Medical kit"]
        },
        {
            "unit_name": "Medical Emergency Unit-1",
            "call_sign": "MED-1",
            "unit_type": UnitType.MEDICAL,
            "status": UnitStatus.AVAILABLE,
            "latitude": 9.9250,
            "longitude": 78.1200,
            "current_address": "Government Hospital, Madurai",
            "capacity": 4,
            "team_leader": "Dr. Priya Sharma",
            "team_size": 3,
            "contact_number": "+91-9876001002",
            "radio_frequency": "156.900",
            "fuel_level": 90.0,
            "equipment": ["Ambulance", "Defibrillator", "Oxygen tank", "Medical supplies"]
        },
        {
            "unit_name": "Water Rescue Boat-1",
            "call_sign": "WR-B1",
            "unit_type": UnitType.WATER_RESCUE,
            "status": UnitStatus.BUSY,
            "latitude": 9.9180,
            "longitude": 78.1100,
            "current_address": "Vaigai River Dock, Madurai",
            "capacity": 8,
            "team_leader": "Lieutenant Suresh",
            "team_size": 5,
            "contact_number": "+91-9876001003",
            "radio_frequency": "157.000",
            "fuel_level": 70.0,
            "equipment": ["Rescue boat", "Life jackets", "Rope", "Diving gear"]
        },
        {
            "unit_name": "Police Patrol Unit-5",
            "call_sign": "PP-5",
            "unit_type": UnitType.POLICE,
            "status": UnitStatus.EN_ROUTE,
            "latitude": 9.9100,
            "longitude": 78.1250,
            "current_address": "Police Station Central, Madurai",
            "capacity": 4,
            "team_leader": "Inspector Vijay",
            "team_size": 2,
            "contact_number": "+91-9876001004",
            "radio_frequency": "156.700",
            "fuel_level": 75.0,
            "equipment": ["Patrol vehicle", "Radio", "First aid kit", "Traffic cones"]
        },
        {
            "unit_name": "Search Rescue Helicopter",
            "call_sign": "SAR-H1",
            "unit_type": UnitType.SEARCH_RESCUE,
            "status": UnitStatus.AVAILABLE,
            "latitude": 9.9350,
            "longitude": 78.1050,
            "current_address": "Madurai Airport Helipad",
            "capacity": 12,
            "team_leader": "Captain Anita Singh",
            "team_size": 6,
            "contact_number": "+91-9876001005",
            "radio_frequency": "157.100",
            "fuel_level": 95.0,
            "equipment": ["Helicopter", "Winch system", "Medical kit", "Search lights"]
        }
    ]
    
    created_count = 0
    
    for unit_data in demo_units:
        try:
            # Check if unit already exists
            existing_unit = db.query(RescueUnit).filter(RescueUnit.unit_name == unit_data["unit_name"]).first()
            if existing_unit:
                logger.info(f"Rescue unit {unit_data['unit_name']} already exists")
                continue
            
            # Create rescue unit
            unit = RescueUnit(
                unit_name=unit_data["unit_name"],
                call_sign=unit_data["call_sign"],
                unit_type=unit_data["unit_type"],
                status=unit_data["status"],
                current_address=unit_data["current_address"],
                capacity=unit_data["capacity"],
                team_leader=unit_data["team_leader"],
                team_size=unit_data["team_size"],
                contact_number=unit_data["contact_number"],
                radio_frequency=unit_data["radio_frequency"],
                fuel_level=unit_data["fuel_level"],
                equipment=json.dumps(unit_data["equipment"])
            )
            
            # Create location geometry
            try:
                unit.location = func.ST_GeogFromText(
                    f'POINT({unit_data["longitude"]} {unit_data["latitude"]})'
                )
                unit.base_location = unit.location
            except Exception as e:
                logger.warning(f"Could not create geometry for unit {unit_data['unit_name']}: {e}")
            
            db.add(unit)
            db.commit()
            db.refresh(unit)
            
            logger.info(f"✅ Created rescue unit: {unit_data['unit_name']}")
            created_count += 1
            
        except SQLAlchemyError as e:
            logger.error(f"❌ Error creating rescue unit {unit_data['unit_name']}: {e}")
            db.rollback()
    
    return created_count


def create_demo_incidents(db):
    """Create demo incidents"""
    logger.info("📋 Creating demo incidents...")
    
    # Get a reporter user
    reporter = db.query(User).filter(User.email == "responder@demo.com").first()
    if not reporter:
        logger.error("❌ No reporter user found")
        return 0
    
    demo_incidents = [
        {
            "title": "Severe flooding in residential area",
            "description": "Multiple houses affected by rising water levels due to blocked drainage system",
            "incident_type": IncidentType.FLOOD,
            "severity": SeverityLevel.HIGH,
            "status": IncidentStatus.REPORTED,
            "latitude": 9.9220,
            "longitude": 78.1180,
            "address": "Sellur Main Road, Madurai",
            "landmark": "Near Sellur Murugan Temple",
            "affected_people_count": 15,
            "water_level": 1.5
        },
        {
            "title": "Family stranded on rooftop",
            "description": "Elderly family unable to evacuate from flooded house, immediate rescue needed",
            "incident_type": IncidentType.RESCUE_NEEDED,
            "severity": SeverityLevel.CRITICAL,
            "status": IncidentStatus.ASSIGNED,
            "latitude": 9.9180,
            "longitude": 78.1120,
            "address": "Krishnan Koil Street, Madurai",
            "landmark": "Behind Government School",
            "affected_people_count": 4,
            "water_level": 2.1
        },
        {
            "title": "Road closure due to waterlogging",
            "description": "Main connecting road blocked due to severe waterlogging, traffic diverted",
            "incident_type": IncidentType.ROAD_CLOSURE,
            "severity": SeverityLevel.MEDIUM,
            "status": IncidentStatus.IN_PROGRESS,
            "latitude": 9.9150,
            "longitude": 78.1300,
            "address": "Bypass Road, Madurai",
            "landmark": "Near TVS Signal",
            "affected_people_count": 0,
            "water_level": 0.8
        },
        {
            "title": "Power outage in commercial area",
            "description": "Electrical substation flooded, affecting power supply to commercial district",
            "incident_type": IncidentType.POWER_OUTAGE,
            "severity": SeverityLevel.HIGH,
            "status": IncidentStatus.REPORTED,
            "latitude": 9.9195,
            "longitude": 78.1278,
            "address": "Commercial Street, Madurai",
            "landmark": "Near City Center Mall",
            "affected_people_count": 500,
            "water_level": 0.3
        },
        {
            "title": "Medical emergency - cardiac patient",
            "description": "Cardiac patient needs immediate evacuation from flooded area",
            "incident_type": IncidentType.MEDICAL_EMERGENCY,
            "severity": SeverityLevel.CRITICAL,
            "status": IncidentStatus.REPORTED,
            "latitude": 9.9240,
            "longitude": 78.1160,
            "address": "Gandhi Nagar, Madurai",
            "landmark": "Near Primary Health Center",
            "affected_people_count": 1,
            "water_level": 1.2
        }
    ]
    
    created_count = 0
    
    for incident_data in demo_incidents:
        try:
            # Create incident
            incident = Incident(
                title=incident_data["title"],
                description=incident_data["description"],
                incident_type=incident_data["incident_type"],
                severity=incident_data["severity"],
                status=incident_data["status"],
                address=incident_data["address"],
                landmark=incident_data["landmark"],
                affected_people_count=incident_data["affected_people_count"],
                water_level=incident_data["water_level"],
                reporter_id=reporter.id
            )
            
            # Create location geometry
            try:
                incident.location = func.ST_GeogFromText(
                    f'POINT({incident_data["longitude"]} {incident_data["latitude"]})'
                )
            except Exception as e:
                logger.warning(f"Could not create geometry for incident {incident_data['title']}: {e}")
            
            db.add(incident)
            db.commit()
            db.refresh(incident)
            
            logger.info(f"✅ Created incident: {incident_data['title']}")
            created_count += 1
            
        except SQLAlchemyError as e:
            logger.error(f"❌ Error creating incident {incident_data['title']}: {e}")
            db.rollback()
    
    # Assign some incidents to rescue units
    try:
        water_rescue_unit = db.query(RescueUnit).filter(RescueUnit.call_sign == "WR-B1").first()
        rescue_incident = db.query(Incident).filter(Incident.title.contains("stranded")).first()
        
        if water_rescue_unit and rescue_incident:
            rescue_incident.assigned_unit_id = water_rescue_unit.id
            db.commit()
            logger.info("✅ Assigned water rescue unit to stranded family incident")
    
    except Exception as e:
        logger.warning(f"Could not assign units to incidents: {e}")
    
    return created_count


def test_authentication(db):
    """Test user authentication"""
    logger.info("🔐 Testing authentication...")
    
    test_credentials = [
        ("responder@demo.com", "demo123"),
        ("command@demo.com", "demo123"),
        ("officer@demo.com", "demo123"),
        ("admin@demo.com", "demo123")
    ]
    
    success_count = 0
    
    for email, password in test_credentials:
        try:
            user = db.query(User).filter(User.email == email).first()
            if user and user.verify_password(password):
                logger.info(f"  ✅ {email}: Authentication successful")
                success_count += 1
            else:
                logger.error(f"  ❌ {email}: Authentication failed")
        except Exception as e:
            logger.error(f"  ❌ {email}: Error - {e}")
    
    return success_count


def run_diagnostics():
    """Run comprehensive diagnostics and seeding"""
    logger.info("🔍 Running Emergency Flood Response System Setup...")
    logger.info("=" * 60)
    
    # Check database connection
    if not check_database_connection():
        return False
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create demo data
        users_created = create_demo_users(db)
        zones_created = create_demo_flood_zones(db)
        units_created = create_demo_rescue_units(db)
        incidents_created = create_demo_incidents(db)
        
        # Test authentication
        auth_success = test_authentication(db)
        
        logger.info("=" * 60)
        logger.info("✅ Setup completed successfully!")
        logger.info(f"📊 Summary:")
        logger.info(f"  - Users created: {users_created}")
        logger.info(f"  - Flood zones created: {zones_created}")
        logger.info(f"  - Rescue units created: {units_created}")
        logger.info(f"  - Incidents created: {incidents_created}")
        logger.info(f"  - Authentication tests passed: {auth_success}/4")
        
        logger.info("\n🔐 Demo Account Credentials:")
        logger.info("├── Field Responder:  responder@demo.com / demo123")
        logger.info("├── Command Center:   command@demo.com / demo123")
        logger.info("├── District Officer: officer@demo.com / demo123")
        logger.info("└── Admin:            admin@demo.com / demo123")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Setup failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def seed_database():
    """Main seeding function"""
    logger.info("🌱 Starting database seeding...")
    success = run_diagnostics()
    
    if success:
        logger.info("🎉 Database seeding completed successfully!")
    else:
        logger.error("❌ Database seeding failed!")
        sys.exit(1)


def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Just run diagnostics
        success = run_diagnostics()
        sys.exit(0 if success else 1)
    else:
        # Run full seed
        seed_database()


if __name__ == "__main__":
    main()
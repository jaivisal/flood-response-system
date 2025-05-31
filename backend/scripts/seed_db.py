"""
Debug version of seed_db.py with better error handling and logging
Run this to check if demo users exist and troubleshoot authentication
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import json
from datetime import datetime, timedelta
from sqlalchemy import func, text
from sqlalchemy.exc import SQLAlchemyError
from geoalchemy2 import Geometry
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


def check_existing_users(db):
    """Check if demo users already exist"""
    logger.info("👥 Checking existing users...")
    
    try:
        users = db.query(User).all()
        logger.info(f"Found {len(users)} existing users:")
        
        for user in users:
            logger.info(f"  - {user.email} ({user.role.value}) - Active: {user.is_active}")
        
        return users
    except SQLAlchemyError as e:
        logger.error(f"❌ Error checking existing users: {e}")
        return []


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
                
                # Verify password works
                if existing_user.verify_password(user_data["password"]):
                    logger.info(f"  ✅ Password verification successful for {user_data['email']}")
                else:
                    logger.warning(f"  ⚠️ Password verification failed for {user_data['email']}")
                    # Reset password
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
            
            # Verify the password immediately
            if user.verify_password(user_data["password"]):
                logger.info(f"  ✅ Password verification successful")
            else:
                logger.error(f"  ❌ Password verification failed!")
            
            created_count += 1
            
        except SQLAlchemyError as e:
            logger.error(f"❌ Error creating user {user_data['email']}: {e}")
            db.rollback()
    
    if created_count > 0:
        logger.info(f"✅ Created {created_count} new demo users")
    else:
        logger.info("ℹ️ All demo users already exist")


def test_user_authentication(db):
    """Test authentication for demo users"""
    logger.info("🔐 Testing user authentication...")
    
    test_credentials = [
        ("responder@demo.com", "demo123"),
        ("command@demo.com", "demo123"),
        ("officer@demo.com", "demo123"),
        ("admin@demo.com", "demo123")
    ]
    
    for email, password in test_credentials:
        try:
            user = db.query(User).filter(User.email == email).first()
            if user:
                if user.verify_password(password):
                    logger.info(f"  ✅ {email}: Authentication successful")
                else:
                    logger.error(f"  ❌ {email}: Authentication failed")
            else:
                logger.error(f"  ❌ {email}: User not found")
        except Exception as e:
            logger.error(f"  ❌ {email}: Error during authentication test: {e}")


def check_database_tables(db):
    """Check if all required tables exist"""
    logger.info("📋 Checking database tables...")
    
    try:
        # Test each table
        tables_to_check = [
            ("users", User),
            ("incidents", Incident),
            ("rescue_units", RescueUnit),
            ("flood_zones", FloodZone)
        ]
        
        for table_name, model in tables_to_check:
            try:
                count = db.query(model).count()
                logger.info(f"  ✅ {table_name}: {count} records")
            except SQLAlchemyError as e:
                logger.error(f"  ❌ {table_name}: Error - {e}")
                
    except Exception as e:
        logger.error(f"❌ Error checking tables: {e}")


def run_diagnostics():
    """Run comprehensive diagnostics"""
    logger.info("🔍 Running Emergency Flood Response System Diagnostics...")
    logger.info("=" * 60)
    
    # Check database connection
    if not check_database_connection():
        return False
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Check tables
        check_database_tables(db)
        
        # Check existing users
        existing_users = check_existing_users(db)
        
        # Create demo users if needed
        create_demo_users(db)
        
        # Test authentication
        test_user_authentication(db)
        
        logger.info("=" * 60)
        logger.info("✅ Diagnostics completed successfully!")
        
        logger.info("\n🔐 Demo Account Credentials:")
        logger.info("├── Field Responder:  responder@demo.com / demo123")
        logger.info("├── Command Center:   command@demo.com / demo123")
        logger.info("├── District Officer: officer@demo.com / demo123")
        logger.info("└── Admin:            admin@demo.com / demo123")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Diagnostics failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Just run diagnostics
        success = run_diagnostics()
        sys.exit(0 if success else 1)
    else:
        # Run full seed
        logger.info("🌱 Starting database seeding...")
        success = run_diagnostics()
        
        if success:
            logger.info("🎉 Database setup completed successfully!")
        else:
            logger.error("❌ Database setup failed!")
            sys.exit(1)


if __name__ == "__main__":
    main()
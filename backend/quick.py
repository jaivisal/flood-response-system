#!/usr/bin/env python3
"""
Debug login issues script
Run this to identify the exact problem with login
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings
import logging
from passlib.context import CryptContext

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_password_verification():
    """Debug password verification differences"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        # Get user data
        user = db.execute(text("""
            SELECT id, email, hashed_password, is_active 
            FROM users 
            WHERE email = 'responder@demo.com'
        """)).fetchone()
        
        if not user:
            logger.error("❌ Demo user not found")
            return
        
        logger.info(f"📊 User found: ID={user.id}, Active={user.is_active}")
        logger.info(f"🔐 Stored hash: {user.hashed_password[:50]}...")
        
        # Test with different password contexts
        test_password = "demo123"
        
        # Method 1: Simple passlib context (like in fix script)
        pwd_context_simple = CryptContext(schemes=["bcrypt"], deprecated="auto")
        result1 = pwd_context_simple.verify(test_password, user.hashed_password)
        logger.info(f"Method 1 (simple): {result1}")
        
        # Method 2: With rounds=12 (like in User model)
        pwd_context_rounds = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
        result2 = pwd_context_rounds.verify(test_password, user.hashed_password)
        logger.info(f"Method 2 (rounds=12): {result2}")
        
        # Method 3: Try importing User model and use its method
        try:
            # Import with minimal dependencies
            import importlib.util
            spec = importlib.util.spec_from_file_location("user_model", "app/models/user.py")
            user_module = importlib.util.module_from_spec(spec)
            
            # Skip this test to avoid import issues
            logger.info("Method 3 (User model): Skipped to avoid import issues")
            
        except Exception as e:
            logger.warning(f"Method 3 failed: {e}")
        
        # Method 4: Test the exact context from User model
        try:
            from app.models.user import pwd_context
            result4 = pwd_context.verify(test_password, user.hashed_password)
            logger.info(f"Method 4 (User model context): {result4}")
        except Exception as e:
            logger.warning(f"Method 4 failed: {e}")
        
        # Generate new hash with User model context and compare
        try:
            from app.models.user import User
            new_hash = User.hash_password(test_password)
            logger.info(f"🔐 New hash from User model: {new_hash[:50]}...")
            
            # Test if new hash works
            result5 = pwd_context_simple.verify(test_password, new_hash)
            logger.info(f"New hash verification: {result5}")
            
            # Update user with new hash
            logger.info("💾 Updating user with new hash...")
            db.execute(text("""
                UPDATE users 
                SET hashed_password = :new_hash
                WHERE email = 'responder@demo.com'
            """), {"new_hash": new_hash})
            db.commit()
            
            logger.info("✅ Updated user with new hash from User model")
            
        except Exception as e:
            logger.error(f"❌ User model hash generation failed: {e}")
        
    except Exception as e:
        logger.error(f"❌ Debug failed: {e}")
        if 'db' in locals():
            db.rollback()
    finally:
        if 'db' in locals():
            db.close()

def test_auth_router_simulation():
    """Simulate what happens in the auth router"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        logger.info("🔍 Simulating auth router logic...")
        
        # Step 1: Find user (like in auth router)
        email = "responder@demo.com"
        user = db.execute(text("""
            SELECT id, email, hashed_password, is_active, role
            FROM users 
            WHERE email = :email
        """), {"email": email.lower().strip()}).fetchone()
        
        if not user:
            logger.error("❌ User not found in auth simulation")
            return
        
        logger.info(f"✅ User found: {user.email}, Active: {user.is_active}")
        
        # Step 2: Verify password (like in auth router)
        password = "demo123"
        
        # Try the exact method from User model
        try:
            from app.models.user import pwd_context
            verification_result = pwd_context.verify(password, user.hashed_password)
            logger.info(f"🔐 Password verification result: {verification_result}")
            
            if verification_result:
                logger.info("✅ Auth simulation successful!")
            else:
                logger.error("❌ Auth simulation failed - password incorrect")
                
                # Try to fix by generating new hash
                logger.info("🔧 Generating new hash with User model...")
                from app.models.user import User
                new_hash = User.hash_password(password)
                
                db.execute(text("""
                    UPDATE users 
                    SET hashed_password = :new_hash
                    WHERE email = :email
                """), {"new_hash": new_hash, "email": email})
                db.commit()
                
                logger.info("✅ Updated with new hash, try login again")
                
        except Exception as e:
            logger.error(f"❌ Auth simulation error: {e}")
        
    except Exception as e:
        logger.error(f"❌ Simulation failed: {e}")
        if 'db' in locals():
            db.rollback()
    finally:
        if 'db' in locals():
            db.close()

def check_bcrypt_versions():
    """Check bcrypt versions and compatibility"""
    try:
        import bcrypt
        import passlib
        logger.info(f"📦 Bcrypt version: {bcrypt.__version__}")
        logger.info(f"📦 Passlib version: {passlib.__version__}")
        
        # Test basic bcrypt functionality
        password = "demo123"
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        verified = bcrypt.checkpw(password.encode('utf-8'), hashed)
        
        logger.info(f"🧪 Direct bcrypt test: {verified}")
        logger.info(f"🔐 Direct bcrypt hash: {hashed.decode()[:50]}...")
        
    except Exception as e:
        logger.error(f"❌ Bcrypt test failed: {e}")

def main():
    """Main debug function"""
    logger.info("🐛 Login Debug Script")
    logger.info("=" * 50)
    
    logger.info("1. Checking bcrypt versions...")
    check_bcrypt_versions()
    
    logger.info("\n2. Testing password verification methods...")
    debug_password_verification()
    
    logger.info("\n3. Simulating auth router...")
    test_auth_router_simulation()
    
    logger.info("=" * 50)
    logger.info("🐛 Debug completed")

if __name__ == "__main__":
    main()
"""
Enhanced User model with better password handling and validation
backend/app/models/user.py - FIXED VERSION WITH CORRECT RELATIONSHIPS
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from passlib.context import CryptContext
import enum
from datetime import datetime

from app.database import Base

# Enhanced password hashing configuration
pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__rounds=12  # Increased security
)


class UserRole(str, enum.Enum):
    """Enhanced User roles enum with display names"""
    FIELD_RESPONDER = "field_responder"
    COMMAND_CENTER = "command_center"
    DISTRICT_OFFICER = "district_officer"
    ADMIN = "admin"

    @property
    def display_name(self):
        """Get human-readable role name"""
        names = {
            "field_responder": "Field Responder",
            "command_center": "Command Center",
            "district_officer": "District Officer",
            "admin": "Administrator"
        }
        return names.get(self.value, self.value.replace('_', ' ').title())


class User(Base):
    """Enhanced User model with additional fields and methods"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="field_responder")
    
    # Status fields
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_online = Column(Boolean, default=False)
    
    # Contact information
    phone_number = Column(String, nullable=True)
    department = Column(String, nullable=True)
    employee_id = Column(String, nullable=True, unique=True)
    
    # Location tracking for field responders
    last_known_latitude = Column(String, nullable=True)  # Store as string for precision
    last_known_longitude = Column(String, nullable=True)
    last_location_update = Column(DateTime(timezone=True), nullable=True)
    
    # Security and audit fields
    last_login = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0)
    failed_login_attempts = Column(Integer, default=0)
    account_locked_until = Column(DateTime(timezone=True), nullable=True)
    password_reset_token = Column(String, nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Profile information
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    notification_preferences = Column(Text, nullable=True)  # JSON string
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # FIXED: Relationships with explicit foreign_keys specification
    reported_incidents = relationship(
        "Incident", 
        foreign_keys="Incident.reporter_id",
        back_populates="reporter", 
        cascade="all, delete-orphan"
    )
    
    # Additional relationships for incidents assigned/verified by this user
    assigned_incidents = relationship(
        "Incident",
        foreign_keys="Incident.assigned_by_id",
        back_populates="assigned_by"
    )
    
    verified_incidents = relationship(
        "Incident",
        foreign_keys="Incident.verified_by_id", 
        back_populates="verified_by"
    )

    def verify_password(self, password: str) -> bool:
        """Verify password against hash with enhanced security"""
        try:
            return pwd_context.verify(password, self.hashed_password)
        except Exception:
            return False

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password with enhanced security"""
        if not password or len(password) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return pwd_context.hash(password)

    def set_password(self, password: str):
        """Set hashed password with validation"""
        if not password:
            raise ValueError("Password cannot be empty")
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters long")
        self.hashed_password = self.hash_password(password)

    def update_last_login(self):
        """Update last login timestamp and increment login count"""
        self.last_login = datetime.utcnow()
        self.login_count += 1
        self.failed_login_attempts = 0  # Reset failed attempts on successful login

    def increment_failed_login(self):
        """Increment failed login attempts"""
        self.failed_login_attempts += 1
        # Lock account after 5 failed attempts for 30 minutes
        if self.failed_login_attempts >= 5:
            from datetime import timedelta
            self.account_locked_until = datetime.utcnow() + timedelta(minutes=30)

    def is_account_locked(self) -> bool:
        """Check if account is currently locked"""
        if not self.account_locked_until:
            return False
        return datetime.utcnow() < self.account_locked_until

    def unlock_account(self):
        """Unlock account and reset failed attempts"""
        self.account_locked_until = None
        self.failed_login_attempts = 0

    def update_location(self, latitude: float, longitude: float):
        """Update user's last known location"""
        self.last_known_latitude = str(latitude)
        self.last_known_longitude = str(longitude)
        self.last_location_update = datetime.utcnow()

    # Role-based permission methods
    @property
    def is_field_responder(self) -> bool:
        """Check if user is field responder"""
        return self.role == UserRole.FIELD_RESPONDER

    @property
    def is_command_center(self) -> bool:
        """Check if user is command center"""
        return self.role == UserRole.COMMAND_CENTER

    @property
    def is_district_officer(self) -> bool:
        """Check if user is district officer"""
        return self.role == UserRole.DISTRICT_OFFICER

    @property
    def is_admin(self) -> bool:
        """Check if user is admin"""
        return self.role == UserRole.ADMIN

    def can_view_all_incidents(self) -> bool:
        """Check if user can view all incidents"""
        return self.role in [UserRole.COMMAND_CENTER, UserRole.DISTRICT_OFFICER, UserRole.ADMIN]

    def can_manage_rescue_units(self) -> bool:
        """Check if user can manage rescue units"""
        return self.role in [UserRole.COMMAND_CENTER, UserRole.ADMIN]

    def can_manage_flood_zones(self) -> bool:
        """Check if user can manage flood zones"""
        return self.role in [UserRole.DISTRICT_OFFICER, UserRole.ADMIN]

    def can_assign_units(self) -> bool:
        """Check if user can assign rescue units to incidents"""
        return self.role in [UserRole.COMMAND_CENTER, UserRole.ADMIN]

    def can_update_incident_status(self) -> bool:
        """Check if user can update incident status"""
        return self.role in [UserRole.FIELD_RESPONDER, UserRole.COMMAND_CENTER, UserRole.ADMIN]

    def can_delete_incident(self) -> bool:
        """Check if user can delete incidents"""
        return self.role == UserRole.ADMIN

    def can_create_user(self) -> bool:
        """Check if user can create other users"""
        return self.role == UserRole.ADMIN

    def can_view_analytics(self) -> bool:
        """Check if user can view analytics and reports"""
        return self.role in [UserRole.COMMAND_CENTER, UserRole.DISTRICT_OFFICER, UserRole.ADMIN]

    def get_permissions(self) -> dict:
        """Get all permissions for the user"""
        return {
            "can_view_all_incidents": self.can_view_all_incidents(),
            "can_manage_rescue_units": self.can_manage_rescue_units(),
            "can_manage_flood_zones": self.can_manage_flood_zones(),
            "can_assign_units": self.can_assign_units(),
            "can_update_incident_status": self.can_update_incident_status(),
            "can_delete_incident": self.can_delete_incident(),
            "can_create_user": self.can_create_user(),
            "can_view_analytics": self.can_view_analytics(),
        }

    def to_dict(self) -> dict:
        """Convert user to dictionary for API responses"""
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role.value,
            "role_display_name": self.role.display_name,
            "phone_number": self.phone_number,
            "department": self.department,
            "employee_id": self.employee_id,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "is_online": self.is_online,
            "avatar_url": self.avatar_url,
            "bio": self.bio,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "login_count": self.login_count,
            "permissions": self.get_permissions(),
        }

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role.value}', active={self.is_active})>"
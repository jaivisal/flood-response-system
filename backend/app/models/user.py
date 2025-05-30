"""
User model for authentication and authorization
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from passlib.context import CryptContext
import enum

from app.database import Base

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserRole(str, enum.Enum):
    """User roles enum"""
    FIELD_RESPONDER = "field_responder"
    COMMAND_CENTER = "command_center"
    DISTRICT_OFFICER = "district_officer"
    ADMIN = "admin"


class User(Base):
    """User model"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.FIELD_RESPONDER)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    phone_number = Column(String, nullable=True)
    department = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    reported_incidents = relationship("Incident", back_populates="reporter")

    def verify_password(self, password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(password, self.hashed_password)

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password"""
        return pwd_context.hash(password)

    def set_password(self, password: str):
        """Set hashed password"""
        self.hashed_password = self.hash_password(password)

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

    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role}')>"
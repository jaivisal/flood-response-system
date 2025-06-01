"""
Updated User schemas for Emergency Flood Response API
backend/app/schemas/user.py - COMPLETE VERSION
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    role: UserRole = UserRole.FIELD_RESPONDER
    phone_number: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=100)

    @validator('phone_number')
    def validate_phone_number(cls, v):
        if v is not None and not v.strip():
            return None
        return v

    @validator('department')
    def validate_department(cls, v):
        if v is not None and not v.strip():
            return None
        return v


class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=6, max_length=100)
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "email": "responder@demo.com",
                "full_name": "John Smith",
                "password": "demo123",
                "role": "field_responder",
                "phone_number": "+91-9876543210",
                "department": "Emergency Response Team Alpha"
            }
        }


class UserUpdate(BaseModel):
    """User update schema"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """User response schema"""
    id: int
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """User login schema"""
    email: EmailStr
    password: str
    
    @validator('email')
    def validate_email(cls, v):
        return v.lower().strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "responder@demo.com",
                "password": "demo123"
            }
        }


class UserProfile(BaseModel):
    """User profile schema for token response"""
    id: int
    email: str
    full_name: str
    role: str  # String representation for frontend
    phone_number: Optional[str] = None
    department: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    
    @validator('role', pre=True)
    def convert_role_to_string(cls, v):
        if hasattr(v, 'value'):
            return v.value
        return str(v)
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserProfile


class TokenData(BaseModel):
    """Token data for validation"""
    email: Optional[str] = None
    user_id: Optional[int] = None


class PasswordChange(BaseModel):
    """Password change schema"""
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=100)
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 6:
            raise ValueError('New password must be at least 6 characters long')
        return v


class PasswordReset(BaseModel):
    """Password reset schema"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema"""
    token: str
    new_password: str = Field(..., min_length=6, max_length=100)


class UserStats(BaseModel):
    """User statistics schema"""
    total_users: int
    active_users: int
    by_role: dict
    recent_logins: int
    created_today: int
"""
Updated Authentication router with better frontend integration
backend/app/routers/auth.py - COMPLETE FIXED VERSION
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional, List
import logging

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import (
    UserCreate, UserResponse, UserLogin, Token, TokenData, 
    UserProfile, PasswordChange, PasswordReset
)
from app.config import settings
from app.utils.auth import create_access_token, verify_token

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()

# OAuth2 scheme for token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None or user_id is None:
            raise credentials_exception
        token_data = TokenData(email=email, user_id=user_id)
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise credentials_exception
    
    try:
        user = db.query(User).filter(User.email == token_data.email).first()
        if user is None:
            raise credentials_exception
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        return user
    except SQLAlchemyError as e:
        logger.error(f"Database error in get_current_user: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_role(allowed_roles: List[UserRole]):
    """Dependency to require specific user roles"""
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of these roles: {[role.value for role in allowed_roles]}"
            )
        return current_user
    return role_checker


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        db_user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            role=user_data.role,
            phone_number=user_data.phone_number,
            department=user_data.department,
            is_active=True,
            is_verified=False
        )
        db_user.set_password(user_data.password)
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"New user registered: {user_data.email}")
        return db_user
        
    except SQLAlchemyError as e:
        logger.error(f"Database error during registration: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during registration"
        )


@router.post("/login", response_model=Token)
async def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticate user and return access token"""
    
    try:
        # Find user by email
        user = db.query(User).filter(User.email == form_data.username).first()
        
        if not user:
            logger.warning(f"Login attempt with non-existent email: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.verify_password(form_data.password):
            logger.warning(f"Failed login attempt for user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user account"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id}, 
            expires_delta=access_token_expires
        )
        
        logger.info(f"Successful login: {user.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": UserProfile(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role.value,
                phone_number=user.phone_number,
                department=user.department,
                is_active=user.is_active,
                created_at=user.created_at
            )
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error during login: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during login"
        )
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/login-json", response_model=Token)
async def login_user_json(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with JSON payload - FRONTEND COMPATIBLE VERSION"""
    
    try:
        logger.info(f"JSON Login attempt for: {user_credentials.email}")
        
        # Find user by email
        user = db.query(User).filter(User.email == user_credentials.email).first()
        
        if not user:
            logger.warning(f"Login attempt with non-existent email: {user_credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Verify password
        if not user.verify_password(user_credentials.password):
            logger.warning(f"Failed password verification for user: {user_credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {user_credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user account"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id}, 
            expires_delta=access_token_expires
        )
        
        logger.info(f"Successful JSON login: {user.email} (Role: {user.role})")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": UserProfile(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=user.role.value,
                phone_number=user.phone_number,
                department=user.department,
                is_active=user.is_active,
                created_at=user.created_at
            )
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error during JSON login: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during login"
        )
    except Exception as e:
        logger.error(f"Unexpected error during JSON login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user profile - FRONTEND COMPATIBLE"""
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        phone_number=current_user.phone_number,
        department=current_user.department,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    
    try:
        if not current_user.verify_password(password_data.current_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password"
            )
        
        current_user.set_password(password_data.new_password)
        db.commit()
        
        logger.info(f"Password changed for user: {current_user.email}")
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error during password change: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )


@router.post("/refresh-token", response_model=Token)
async def refresh_access_token(current_user: User = Depends(get_current_active_user)):
    """Refresh access token"""
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user.email, "user_id": current_user.id}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserProfile(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            role=current_user.role.value,
            phone_number=current_user.phone_number,
            department=current_user.department,
            is_active=current_user.is_active,
            created_at=current_user.created_at
        )
    }


@router.post("/verify-token")
async def verify_user_token(token: str, db: Session = Depends(get_db)):
    """Verify if token is valid"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        
        if email is None or user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user = db.query(User).filter(User.email == email, User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token or inactive user"
            )
        
        return {"valid": True, "user_id": user_id, "email": email}
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except SQLAlchemyError as e:
        logger.error(f"Database error during token verification: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.COMMAND_CENTER])),
    db: Session = Depends(get_db)
):
    """List all users (admin/command center only)"""
    try:
        users = db.query(User).offset(skip).limit(limit).all()
        return users
    except SQLAlchemyError as e:
        logger.error(f"Database error listing users: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )


@router.get("/logout")
async def logout_user(current_user: User = Depends(get_current_active_user)):
    """Logout user (client should discard token)"""
    logger.info(f"User logged out: {current_user.email}")
    return {"message": "Successfully logged out. Please discard your access token."}
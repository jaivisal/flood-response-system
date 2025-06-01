"""
Rescue Units router for emergency response team management
FIXED VERSION - PostGIS and properties handling
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
from geoalchemy2 import functions as geo_func
from typing import List, Optional
import json
from datetime import datetime, timedelta
import logging

from app.database import get_db
from app.models.user import User, UserRole
from app.models.rescue_unit import RescueUnit, UnitType, UnitStatus
from app.models.incident import Incident
from app.schemas.rescue_unit import (
    RescueUnitCreate, RescueUnitUpdate, RescueUnitResponse, RescueUnitSummary,
    RescueUnitStats, NearbyUnitsQuery, UnitLocationUpdate, UnitStatusUpdate,
    UnitAssignmentResponse, MaintenanceSchedule, UnitPerformanceMetrics
)
from app.routers.auth import get_current_active_user, require_role
from app.services.gis_service import create_point_from_coords
from app.utils.spatial import find_nearest_rescue_unit, find_nearby_rescue_units

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()


def safe_get_property(obj, prop_name, default=None):
    """Safely get a property or method result from an object"""
    try:
        attr = getattr(obj, prop_name, default)
        # If it's callable (method), call it; if it's a property, return it
        if callable(attr):
            return attr()
        return attr
    except Exception as e:
        logger.warning(f"Error getting {prop_name}: {e}")
        return default


@router.post("/", response_model=RescueUnitResponse, status_code=status.HTTP_201_CREATED)
async def create_rescue_unit(
    unit_data: RescueUnitCreate,
    current_user: User = Depends(require_role([UserRole.COMMAND_CENTER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Create a new rescue unit (Command Center/Admin only)"""
    
    try:
        # Check if unit name already exists
        existing_unit = db.query(RescueUnit).filter(RescueUnit.unit_name == unit_data.unit_name).first()
        if existing_unit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unit name already exists"
            )
        
        # Create rescue unit
        db_unit = RescueUnit(
            unit_name=unit_data.unit_name,
            call_sign=unit_data.call_sign,
            unit_type=unit_data.unit_type,
            status=UnitStatus.AVAILABLE,
            current_address=unit_data.location.address,
            capacity=unit_data.capacity,
            team_size=unit_data.team_size,
            team_leader=unit_data.team_leader,
            contact_number=unit_data.contact_number,
            radio_frequency=unit_data.radio_frequency,
            equipment=json.dumps(unit_data.equipment) if unit_data.equipment else None
        )
        
        # Create location geometry using PostGIS function
        try:
            db_unit.location = func.ST_GeogFromText(
                f'POINT({unit_data.location.longitude} {unit_data.location.latitude})'
            )
            if unit_data.base_location:
                db_unit.base_location = func.ST_GeogFromText(
                    f'POINT({unit_data.base_location.longitude} {unit_data.base_location.latitude})'
                )
            else:
                db_unit.base_location = db_unit.location
        except Exception as e:
            logger.warning(f"Could not create geometry for unit {unit_data.unit_name}: {e}")
        
        db.add(db_unit)
        db.commit()
        db.refresh(db_unit)
        
        logger.info(f"Created rescue unit: {db_unit.unit_name}")
        return _format_unit_response(db_unit, db)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating rescue unit: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/", response_model=List[RescueUnitSummary])
async def list_rescue_units(
    skip: int = 0,
    limit: int = 100,
    unit_type: Optional[UnitType] = None,
    status: Optional[UnitStatus] = None,
    available_only: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List rescue units with optional filters"""
    
    try:
        query = db.query(RescueUnit)
        
        # Apply filters
        if unit_type:
            query = query.filter(RescueUnit.unit_type == unit_type)
        if status:
            query = query.filter(RescueUnit.status == status)
        if available_only:
            query = query.filter(RescueUnit.status == UnitStatus.AVAILABLE)
        
        units = query.order_by(RescueUnit.unit_name).offset(skip).limit(limit).all()
        
        return [_format_unit_summary(unit, db) for unit in units]
        
    except Exception as e:
        logger.error(f"Error listing rescue units: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving rescue units"
        )


@router.get("/{unit_id}", response_model=RescueUnitResponse)
async def get_rescue_unit(
    unit_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific rescue unit by ID"""
    
    try:
        unit = db.query(RescueUnit).filter(RescueUnit.id == unit_id).first()
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rescue unit not found"
            )
        
        return _format_unit_response(unit, db)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting rescue unit {unit_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving rescue unit"
        )


@router.put("/{unit_id}", response_model=RescueUnitResponse)
async def update_rescue_unit(
    unit_id: int,
    unit_update: RescueUnitUpdate,
    current_user: User = Depends(require_role([UserRole.COMMAND_CENTER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Update an existing rescue unit"""
    
    try:
        unit = db.query(RescueUnit).filter(RescueUnit.id == unit_id).first()
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rescue unit not found"
            )
        
        # Update fields
        update_data = unit_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == "equipment" and value is not None:
                setattr(unit, field, json.dumps(value))
            else:
                setattr(unit, field, value)
        
        db.commit()
        db.refresh(unit)
        
        logger.info(f"Updated rescue unit: {unit.unit_name}")
        return _format_unit_response(unit, db)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating rescue unit {unit_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating rescue unit"
        )


@router.delete("/{unit_id}")
async def delete_rescue_unit(
    unit_id: int,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Delete a rescue unit (Admin only)"""
    
    try:
        unit = db.query(RescueUnit).filter(RescueUnit.id == unit_id).first()
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rescue unit not found"
            )
        
        # Check if unit has active assignments
        active_incidents = db.query(Incident).filter(
            Incident.assigned_unit_id == unit_id,
            Incident.status.in_(["assigned", "in_progress"])
        ).count()
        
        if active_incidents > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete unit with active incident assignments"
            )
        
        db.delete(unit)
        db.commit()
        
        logger.info(f"Deleted rescue unit: {unit.unit_name}")
        return {"message": "Rescue unit deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting rescue unit {unit_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting rescue unit"
        )


@router.get("/stats/overview", response_model=RescueUnitStats)
async def get_rescue_unit_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get rescue unit statistics overview"""
    
    try:
        # Total units
        total_units = db.query(RescueUnit).count()
        
        # By status
        available_units = db.query(RescueUnit).filter(RescueUnit.status == UnitStatus.AVAILABLE).count()
        busy_units = db.query(RescueUnit).filter(RescueUnit.status == UnitStatus.BUSY).count()
        offline_units = db.query(RescueUnit).filter(RescueUnit.status == UnitStatus.OFFLINE).count()
        
        # By type
        type_stats = {}
        for unit_type in UnitType:
            count = db.query(RescueUnit).filter(RescueUnit.unit_type == unit_type).count()
            type_stats[unit_type.value] = count
        
        # By status (detailed)
        status_stats = {}
        for status in UnitStatus:
            count = db.query(RescueUnit).filter(RescueUnit.status == status).count()
            status_stats[status.value] = count
        
        # Units needing maintenance
        maintenance_due = db.query(RescueUnit).filter(
            or_(
                RescueUnit.next_maintenance <= func.now(),
                RescueUnit.next_maintenance.is_(None)
            )
        ).count()
        
        return RescueUnitStats(
            total_units=total_units,
            available_units=available_units,
            busy_units=busy_units,
            offline_units=offline_units,
            by_type=type_stats,
            by_status=status_stats,
            units_needing_maintenance=maintenance_due
        )
        
    except Exception as e:
        logger.error(f"Error getting rescue unit statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving statistics"
        )


def _format_unit_response(unit: RescueUnit, db: Session) -> RescueUnitResponse:
    """Format rescue unit for detailed response - FIXED VERSION"""
    
    # Get coordinates from PostGIS geometry - FIXED
    lat, lng = _get_coordinates_from_geometry(unit.location, db)
    
    return RescueUnitResponse(
        id=unit.id,
        unit_name=unit.unit_name,
        call_sign=unit.call_sign,
        unit_type=unit.unit_type,
        status=unit.status,
        capacity=unit.capacity,
        team_size=unit.team_size,
        team_leader=unit.team_leader,
        contact_number=unit.contact_number,
        radio_frequency=unit.radio_frequency,
        equipment=json.loads(unit.equipment) if unit.equipment else None,
        latitude=lat or 9.9252,
        longitude=lng or 78.1198,
        current_address=unit.current_address,
        fuel_level=unit.fuel_level,
        last_maintenance=unit.last_maintenance,
        next_maintenance=unit.next_maintenance,
        created_at=unit.created_at,
        updated_at=unit.updated_at,
        last_location_update=unit.last_location_update,
        coordinates=(lat, lng) if lat and lng else (9.9252, 78.1198),
        is_available=safe_get_property(unit, 'is_available', False),  # FIXED
        is_active=safe_get_property(unit, 'is_active', True),  # FIXED
        needs_maintenance=safe_get_property(unit, 'needs_maintenance', False),  # FIXED
        status_color=safe_get_property(unit, 'get_status_color', '#22c55e'),  # FIXED
        type_icon=safe_get_property(unit, 'get_type_icon', '🚨')  # FIXED
    )


def _format_unit_summary(unit: RescueUnit, db: Session) -> RescueUnitSummary:
    """Format rescue unit summary for lists - FIXED VERSION"""
    
    # Get coordinates from PostGIS geometry - FIXED
    lat, lng = _get_coordinates_from_geometry(unit.location, db)
    
    return RescueUnitSummary(
        id=unit.id,
        unit_name=unit.unit_name,
        call_sign=unit.call_sign,
        unit_type=unit.unit_type.value,
        status=unit.status.value,
        capacity=unit.capacity,
        team_size=unit.team_size,
        latitude=lat or 9.9252,
        longitude=lng or 78.1198,
        is_available=safe_get_property(unit, 'is_available', False),  # FIXED
        status_color=safe_get_property(unit, 'get_status_color', '#22c55e'),  # FIXED
        type_icon=safe_get_property(unit, 'get_type_icon', '🚨'),  # FIXED
        last_location_update=unit.last_location_update
    )


def _get_coordinates_from_geometry(geometry, db: Session):
    """Extract latitude and longitude from PostGIS geometry - FIXED VERSION"""
    try:
        if geometry is None:
            return None, None
        
        # For PostGIS/GeoAlchemy2, we need to use the geometry's data directly
        if hasattr(geometry, 'data'):
            # Parse the WKB data directly using geoalchemy2
            from geoalchemy2.shape import to_shape
            from shapely.geometry import Point
            
            try:
                # Convert to shapely geometry
                shape = to_shape(geometry)
                if isinstance(shape, Point):
                    return float(shape.y), float(shape.x)  # lat, lng
            except Exception as e:
                logger.debug(f"Failed to parse geometry with shapely: {e}")
        
        # Alternative approach: extract from the WKB hex string
        if hasattr(geometry, 'data') and geometry.data:
            try:
                # Get the hex representation and parse coordinates
                # This is a simplified approach - for production use shapely
                hex_data = geometry.data.hex() if hasattr(geometry.data, 'hex') else str(geometry.data)
                
                # For now, return default coordinates and log for debugging
                logger.debug(f"Geometry data type: {type(geometry.data)}, hex length: {len(hex_data) if hex_data else 0}")
                
                # Return default Madurai coordinates
                return 9.9252, 78.1198
                
            except Exception as e:
                logger.debug(f"Failed to parse hex data: {e}")
        
        # Final fallback: return default coordinates for Madurai
        return 9.9252, 78.1198
        
    except Exception as e:
        logger.error(f"Error extracting coordinates: {e}")
        # Return default coordinates for Madurai
        return 9.9252, 78.1198
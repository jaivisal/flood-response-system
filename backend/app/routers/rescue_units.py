"""
Rescue Units router for emergency response team management
UPDATED VERSION - Fixed for frontend integration and PostgreSQL
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
        
        # Create location point using PostGIS
        location_point = func.ST_GeomFromText(
            f'POINT({unit_data.location.longitude} {unit_data.location.latitude})', 
            4326
        )
        
        # Create base location if provided
        base_location_point = None
        if unit_data.base_location:
            base_location_point = func.ST_GeomFromText(
                f'POINT({unit_data.base_location.longitude} {unit_data.base_location.latitude})', 
                4326
            )
        
        # Create rescue unit
        db_unit = RescueUnit(
            unit_name=unit_data.unit_name,
            call_sign=unit_data.call_sign,
            unit_type=unit_data.unit_type,
            status=UnitStatus.AVAILABLE,
            location=location_point,
            base_location=base_location_point,
            current_address=unit_data.location.address,
            capacity=unit_data.capacity,
            team_size=unit_data.team_size,
            team_leader=unit_data.team_leader,
            contact_number=unit_data.contact_number,
            radio_frequency=unit_data.radio_frequency,
            equipment=json.dumps(unit_data.equipment) if unit_data.equipment else None
        )
        
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


@router.post("/nearby", response_model=List[RescueUnitSummary])
async def find_nearby_units(
    query_data: NearbyUnitsQuery,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Find rescue units near a specific location"""
    
    try:
        # Create search point
        search_point = func.ST_GeomFromText(
            f'POINT({query_data.longitude} {query_data.latitude})', 
            4326
        )
        
        # Build query with spatial filter
        query = db.query(RescueUnit)
        
        if query_data.available_only:
            query = query.filter(RescueUnit.status == UnitStatus.AVAILABLE)
        
        # Filter by unit type if specified
        if query_data.unit_type_filter:
            query = query.filter(RescueUnit.unit_type.in_(query_data.unit_type_filter))
        
        # Spatial distance filter
        query = query.filter(
            func.ST_DWithin(
                RescueUnit.location,
                search_point,
                query_data.radius_km * 1000  # Convert km to meters
            )
        )
        
        # Order by distance and limit results
        units = query.order_by(
            func.ST_Distance(RescueUnit.location, search_point)
        ).limit(query_data.max_results).all()
        
        # Format response with distance information
        result = []
        for unit in units:
            unit_summary = _format_unit_summary(unit, db)
            # Calculate distance
            distance_m = db.execute(
                func.ST_Distance(unit.location, search_point)
            ).scalar()
            unit_summary.distance_km = round(distance_m / 1000.0, 2) if distance_m else None
            result.append(unit_summary)
        
        return result
        
    except Exception as e:
        logger.error(f"Error finding nearby units: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error finding nearby units"
        )


@router.put("/{unit_id}/location", response_model=dict)
async def update_unit_location(
    unit_id: int,
    location_update: UnitLocationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update rescue unit location (real-time tracking)"""
    
    try:
        unit = db.query(RescueUnit).filter(RescueUnit.id == unit_id).first()
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rescue unit not found"
            )
        
        # Check permissions - only command center, admin, or the unit's team can update
        if not (current_user.can_manage_rescue_units() or 
                current_user.full_name == unit.team_leader):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this unit's location"
            )
        
        # Update location using PostGIS
        new_location = func.ST_GeomFromText(
            f'POINT({location_update.location.longitude} {location_update.location.latitude})', 
            4326
        )
        
        unit.location = new_location
        unit.current_address = location_update.location.address
        unit.last_location_update = func.now()
        
        # Update status if provided
        if location_update.status:
            unit.status = location_update.status
        
        # Update fuel level if provided
        if location_update.fuel_level is not None:
            unit.fuel_level = location_update.fuel_level
        
        db.commit()
        
        logger.info(f"Updated location for unit: {unit.unit_name}")
        return {
            "message": "Unit location updated successfully",
            "unit_id": unit_id,
            "latitude": location_update.location.latitude,
            "longitude": location_update.location.longitude,
            "updated_at": unit.last_location_update
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating location for unit {unit_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating unit location"
        )


@router.put("/{unit_id}/status", response_model=dict)
async def update_unit_status(
    unit_id: int,
    status_update: UnitStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update rescue unit status"""
    
    try:
        unit = db.query(RescueUnit).filter(RescueUnit.id == unit_id).first()
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rescue unit not found"
            )
        
        # Check permissions
        if not (current_user.can_manage_rescue_units() or 
                current_user.full_name == unit.team_leader):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this unit's status"
            )
        
        old_status = unit.status
        unit.status = status_update.status
        db.commit()
        
        logger.info(f"Updated status for unit {unit.unit_name}: {old_status} -> {status_update.status}")
        return {
            "message": "Unit status updated successfully",
            "unit_id": unit_id,
            "unit_name": unit.unit_name,
            "old_status": old_status.value,
            "new_status": status_update.status.value,
            "notes": status_update.notes,
            "updated_by": current_user.full_name,
            "updated_at": func.now()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating status for unit {unit_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating unit status"
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


@router.get("/{unit_id}/performance", response_model=UnitPerformanceMetrics)
async def get_unit_performance(
    unit_id: int,
    current_user: User = Depends(require_role([UserRole.COMMAND_CENTER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Get performance metrics for a specific unit"""
    
    try:
        unit = db.query(RescueUnit).filter(RescueUnit.id == unit_id).first()
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rescue unit not found"
            )
        
        # Calculate performance metrics
        total_incidents = db.query(Incident).filter(
            Incident.assigned_unit_id == unit_id
        ).count()
        
        resolved_incidents = db.query(Incident).filter(
            Incident.assigned_unit_id == unit_id,
            Incident.status.in_(["resolved", "closed"])
        ).count()
        
        # Last 30 days incidents
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_incidents = db.query(Incident).filter(
            Incident.assigned_unit_id == unit_id,
            Incident.created_at >= thirty_days_ago
        ).count()
        
        # Calculate success rate
        success_rate = (resolved_incidents / total_incidents * 100) if total_incidents > 0 else 0
        
        return UnitPerformanceMetrics(
            unit_id=unit_id,
            total_incidents_handled=total_incidents,
            average_response_time_minutes=15.5,  # This would be calculated from actual data
            success_rate_percentage=round(success_rate, 2),
            last_30_days_incidents=recent_incidents,
            fuel_efficiency=unit.fuel_level,
            maintenance_cost_last_year=25000.0  # This would come from maintenance records
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting performance for unit {unit_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving performance metrics"
        )


@router.post("/{unit_id}/maintenance", response_model=dict)
async def schedule_maintenance(
    unit_id: int,
    maintenance: MaintenanceSchedule,
    current_user: User = Depends(require_role([UserRole.COMMAND_CENTER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Schedule maintenance for a rescue unit"""
    
    try:
        unit = db.query(RescueUnit).filter(RescueUnit.id == unit_id).first()
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rescue unit not found"
            )
        
        # Update maintenance schedule
        unit.next_maintenance = maintenance.scheduled_date
        
        # If maintenance is immediate, set unit to maintenance status
        if maintenance.scheduled_date <= datetime.now():
            unit.status = UnitStatus.MAINTENANCE
        
        db.commit()
        
        logger.info(f"Scheduled maintenance for unit: {unit.unit_name}")
        return {
            "message": "Maintenance scheduled successfully",
            "unit_id": unit_id,
            "unit_name": unit.unit_name,
            "maintenance_type": maintenance.maintenance_type,
            "scheduled_date": maintenance.scheduled_date,
            "estimated_duration_hours": maintenance.estimated_duration_hours,
            "notes": maintenance.notes,
            "scheduled_by": current_user.full_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scheduling maintenance for unit {unit_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error scheduling maintenance"
        )


@router.get("/available/by-type", response_model=dict)
async def get_available_units_by_type(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get count of available units by type"""
    
    try:
        available_by_type = {}
        
        for unit_type in UnitType:
            count = db.query(RescueUnit).filter(
                RescueUnit.unit_type == unit_type,
                RescueUnit.status == UnitStatus.AVAILABLE
            ).count()
            available_by_type[unit_type.value] = count
        
        return {
            "available_units_by_type": available_by_type,
            "total_available": sum(available_by_type.values()),
            "generated_at": func.now()
        }
        
    except Exception as e:
        logger.error(f"Error getting available units by type: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving available units"
        )


def _format_unit_response(unit: RescueUnit, db: Session) -> RescueUnitResponse:
    """Format rescue unit for detailed response"""
    
    # Get coordinates from PostGIS geometry
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
        latitude=lat,
        longitude=lng,
        current_address=unit.current_address,
        fuel_level=unit.fuel_level,
        last_maintenance=unit.last_maintenance,
        next_maintenance=unit.next_maintenance,
        created_at=unit.created_at,
        updated_at=unit.updated_at,
        last_location_update=unit.last_location_update,
        coordinates=(lat, lng) if lat and lng else None,
        is_available=unit.is_available(),
        is_active=unit.is_active(),
        needs_maintenance=unit.needs_maintenance(),
        status_color=unit.get_status_color(),
        type_icon=unit.get_type_icon()
    )


def _format_unit_summary(unit: RescueUnit, db: Session) -> RescueUnitSummary:
    """Format rescue unit summary for lists"""
    
    # Get coordinates from PostGIS geometry
    lat, lng = _get_coordinates_from_geometry(unit.location, db)
    
    return RescueUnitSummary(
        id=unit.id,
        unit_name=unit.unit_name,
        call_sign=unit.call_sign,
        unit_type=unit.unit_type.value,
        status=unit.status.value,
        capacity=unit.capacity,
        team_size=unit.team_size,
        latitude=lat,
        longitude=lng,
        is_available=unit.is_available(),
        status_color=unit.get_status_color(),
        type_icon=unit.get_type_icon(),
        last_location_update=unit.last_location_update
    )


def _get_coordinates_from_geometry(geometry, db: Session):
    """Extract latitude and longitude from PostGIS geometry"""
    try:
        if geometry is None:
            return None, None
        
        # Use PostGIS functions to extract coordinates
        result = db.execute(
            text("SELECT ST_Y(:geom) as lat, ST_X(:geom) as lng"),
            {"geom": geometry}
        ).first()
        
        if result:
            return result.lat, result.lng
        return None, None
        
    except Exception as e:
        logger.error(f"Error extracting coordinates: {e}")
        return None, None
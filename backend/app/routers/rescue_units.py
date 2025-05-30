"""
Rescue Units router for emergency response team management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from geoalchemy2 import functions as geo_func
from typing import List, Optional
import json
from datetime import datetime, timedelta

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

router = APIRouter()


@router.post("/", response_model=RescueUnitResponse, status_code=status.HTTP_201_CREATED)
async def create_rescue_unit(
    unit_data: RescueUnitCreate,
    current_user: User = Depends(require_role([UserRole.COMMAND_CENTER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Create a new rescue unit (Command Center/Admin only)"""
    
    # Check if unit name already exists
    existing_unit = db.query(RescueUnit).filter(RescueUnit.unit_name == unit_data.unit_name).first()
    if existing_unit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unit name already exists"
        )
    
    # Create location point
    location_point = create_point_from_coords(
        unit_data.location.latitude,
        unit_data.location.longitude
    )
    
    # Create base location if provided
    base_location_point = None
    if unit_data.base_location:
        base_location_point = create_point_from_coords(
            unit_data.base_location.latitude,
            unit_data.base_location.longitude
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
    
    return _format_unit_response(db_unit)


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
    
    query = db.query(RescueUnit)
    
    # Apply filters
    if unit_type:
        query = query.filter(RescueUnit.unit_type == unit_type)
    if status:
        query = query.filter(RescueUnit.status == status)
    if available_only:
        query = query.filter(RescueUnit.status == UnitStatus.AVAILABLE)
    
    units = query.order_by(RescueUnit.unit_name).offset(skip).limit(limit).all()
    
    return [_format_unit_summary(unit) for unit in units]


@router.get("/{unit_id}", response_model=RescueUnitResponse)
async def get_rescue_unit(
    unit_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific rescue unit by ID"""
    
    unit = db.query(RescueUnit).filter(RescueUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rescue unit not found"
        )
    
    return _format_unit_response(unit)


@router.put("/{unit_id}", response_model=RescueUnitResponse)
async def update_rescue_unit(
    unit_id: int,
    unit_update: RescueUnitUpdate,
    current_user: User = Depends(require_role([UserRole.COMMAND_CENTER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Update an existing rescue unit"""
    
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
    
    return _format_unit_response(unit)


@router.delete("/{unit_id}")
async def delete_rescue_unit(
    unit_id: int,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Delete a rescue unit (Admin only)"""
    
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
    
    return {"message": "Rescue unit deleted successfully"}


@router.post("/nearby", response_model=List[RescueUnitSummary])
async def find_nearby_units(
    query_data: NearbyUnitsQuery,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Find rescue units near a specific location"""
    
    # Use the spatial utility function
    nearby_units_with_distance = find_nearby_rescue_units(
        db,
        query_data.latitude,
        query_data.longitude,
        query_data.radius_km,
        query_data.max_results,
        query_data.available_only
    )
    
    # Filter by unit type if specified
    if query_data.unit_type_filter:
        nearby_units_with_distance = [
            (unit, distance) for unit, distance in nearby_units_with_distance
            if unit.unit_type in query_data.unit_type_filter
        ]
    
    # Format response with distance information
    result = []
    for unit, distance in nearby_units_with_distance:
        unit_summary = _format_unit_summary(unit)
        unit_summary.distance_km = round(distance, 2)
        result.append(unit_summary)
    
    return result


@router.put("/{unit_id}/location", response_model=dict)
async def update_unit_location(
    unit_id: int,
    location_update: UnitLocationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update rescue unit location (real-time tracking)"""
    
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
    
    # Update location
    new_location = create_point_from_coords(
        location_update.location.latitude,
        location_update.location.longitude
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
    
    return {
        "message": "Unit location updated successfully",
        "unit_id": unit_id,
        "latitude": location_update.location.latitude,
        "longitude": location_update.location.longitude,
        "updated_at": unit.last_location_update
    }


@router.put("/{unit_id}/status", response_model=dict)
async def update_unit_status(
    unit_id: int,
    status_update: UnitStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update rescue unit status"""
    
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


@router.get("/stats/overview", response_model=RescueUnitStats)
async def get_rescue_unit_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get rescue unit statistics overview"""
    
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
        RescueUnit.next_maintenance <= func.now()
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


@router.get("/{unit_id}/performance", response_model=UnitPerformanceMetrics)
async def get_unit_performance(
    unit_id: int,
    current_user: User = Depends(require_role([UserRole.COMMAND_CENTER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Get performance metrics for a specific unit"""
    
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


@router.post("/{unit_id}/maintenance", response_model=dict)
async def schedule_maintenance(
    unit_id: int,
    maintenance: MaintenanceSchedule,
    current_user: User = Depends(require_role([UserRole.COMMAND_CENTER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Schedule maintenance for a rescue unit"""
    
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


@router.get("/available/by-type", response_model=dict)
async def get_available_units_by_type(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get count of available units by type"""
    
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


def _format_unit_response(unit: RescueUnit) -> RescueUnitResponse:
    """Format rescue unit for detailed response"""
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
        latitude=unit.latitude,
        longitude=unit.longitude,
        current_address=unit.current_address,
        fuel_level=unit.fuel_level,
        last_maintenance=unit.last_maintenance,
        next_maintenance=unit.next_maintenance,
        created_at=unit.created_at,
        updated_at=unit.updated_at,
        last_location_update=unit.last_location_update,
        coordinates=unit.coordinates,
        is_available=unit.is_available(),
        is_active=unit.is_active(),
        needs_maintenance=unit.needs_maintenance(),
        status_color=unit.get_status_color(),
        type_icon=unit.get_type_icon()
    )


def _format_unit_summary(unit: RescueUnit) -> RescueUnitSummary:
    """Format rescue unit summary for lists"""
    return RescueUnitSummary(
        id=unit.id,
        unit_name=unit.unit_name,
        call_sign=unit.call_sign,
        unit_type=unit.unit_type.value,
        status=unit.status.value,
        capacity=unit.capacity,
        team_size=unit.team_size,
        latitude=unit.latitude,
        longitude=unit.longitude,
        is_available=unit.is_available(),
        status_color=unit.get_status_color(),
        type_icon=unit.get_type_icon(),
        last_location_update=unit.last_location_update
    )
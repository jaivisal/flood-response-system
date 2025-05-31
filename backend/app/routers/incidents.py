"""
Incidents router for emergency incident management
FIXED VERSION - Added missing SQLAlchemyError import
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from sqlalchemy.exc import SQLAlchemyError  # ADDED THIS MISSING IMPORT
from geoalchemy2 import functions as geo_func
from typing import List, Optional
import json
import logging

from app.database import get_db
from app.models.user import User, UserRole
from app.models.incident import Incident, IncidentType, SeverityLevel, IncidentStatus
from app.models.rescue_unit import RescueUnit
from app.schemas.incident import (
    IncidentCreate, IncidentUpdate, IncidentResponse, IncidentSummary,
    IncidentStats, NearbyIncidentsQuery, GeoJSONFeatureCollection,
    IncidentAssignment
)
from app.routers.auth import get_current_active_user, require_role
from app.services.gis_service import create_point_from_coords, calculate_distance
from app.utils.spatial import find_nearest_rescue_unit

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    incident_data: IncidentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new incident report"""
    
    # Create location point
    location_point = create_point_from_coords(
        incident_data.location.latitude,
        incident_data.location.longitude
    )
    
    # Create incident
    db_incident = Incident(
        title=incident_data.title,
        description=incident_data.description,
        incident_type=incident_data.incident_type,
        severity=incident_data.severity,
        affected_people_count=incident_data.affected_people_count,
        water_level=incident_data.water_level,
        location=location_point,
        address=incident_data.location.address,
        landmark=incident_data.location.landmark,
        image_url=incident_data.image_url,
        additional_images=json.dumps(incident_data.additional_images) if incident_data.additional_images else None,
        reporter_id=current_user.id,
        status=IncidentStatus.REPORTED
    )
    
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    
    # Auto-assign to nearest available rescue unit for critical incidents
    if incident_data.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]:
        nearest_unit = find_nearest_rescue_unit(
            db, 
            incident_data.location.latitude, 
            incident_data.location.longitude
        )
        if nearest_unit:
            db_incident.assigned_unit_id = nearest_unit.id
            db_incident.status = IncidentStatus.ASSIGNED
            db.commit()
    
    return _format_incident_response(db_incident)


@router.get("/", response_model=List[IncidentSummary])
async def list_incidents(
    skip: int = 0,
    limit: int = 100,
    severity: Optional[SeverityLevel] = None,
    status: Optional[IncidentStatus] = None,
    incident_type: Optional[IncidentType] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List incidents with optional filters"""
    
    query = db.query(Incident)
    
    # Apply filters
    if severity:
        query = query.filter(Incident.severity == severity)
    if status:
        query = query.filter(Incident.status == status)
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    
    # Role-based filtering
    if not current_user.can_view_all_incidents():
        query = query.filter(Incident.reporter_id == current_user.id)
    
    incidents = query.order_by(Incident.created_at.desc()).offset(skip).limit(limit).all()
    
    return [_format_incident_summary(incident) for incident in incidents]


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific incident by ID"""
    
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    # Check permissions
    if not current_user.can_view_all_incidents() and incident.reporter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this incident"
        )
    
    return _format_incident_response(incident)


@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    incident_update: IncidentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update an existing incident"""
    
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    # Check permissions
    can_update = (
        incident.reporter_id == current_user.id or
        current_user.can_view_all_incidents()
    )
    if not can_update:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this incident"
        )
    
    # Update fields
    update_data = incident_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(incident, field, value)
    
    db.commit()
    db.refresh(incident)
    
    return _format_incident_response(incident)


@router.delete("/{incident_id}")
async def delete_incident(
    incident_id: int,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.COMMAND_CENTER])),
    db: Session = Depends(get_db)
):
    """Delete an incident (admin/command center only)"""
    
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    db.delete(incident)
    db.commit()
    
    return {"message": "Incident deleted successfully"}


@router.get("/geojson/all", response_model=GeoJSONFeatureCollection)
async def get_incidents_geojson(
    severity: Optional[List[SeverityLevel]] = Query(None),
    status: Optional[List[IncidentStatus]] = Query(None),
    incident_type: Optional[List[IncidentType]] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all incidents as GeoJSON for map visualization"""
    
    query = db.query(Incident)
    
    # Apply filters
    if severity:
        query = query.filter(Incident.severity.in_(severity))
    if status:
        query = query.filter(Incident.status.in_(status))
    if incident_type:
        query = query.filter(Incident.incident_type.in_(incident_type))
    
    # Role-based filtering
    if not current_user.can_view_all_incidents():
        query = query.filter(Incident.reporter_id == current_user.id)
    
    incidents = query.limit(1000).all()  # Limit for performance
    
    features = [incident.to_geojson_feature() for incident in incidents]
    
    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "total_features": len(features),
            "generated_at": func.now(),
            "filters_applied": {
                "severity": severity,
                "status": status,
                "incident_type": incident_type
            }
        }
    }


@router.post("/nearby", response_model=List[IncidentSummary])
async def get_nearby_incidents(
    query_data: NearbyIncidentsQuery,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Find incidents near a specific location"""
    
    # Create point for location
    search_point = create_point_from_coords(query_data.latitude, query_data.longitude)
    
    # Build query with spatial filter
    query = db.query(Incident).filter(
        geo_func.ST_DWithin(
            Incident.location,
            search_point,
            query_data.radius_km * 1000  # Convert km to meters
        )
    )
    
    # Apply additional filters
    if query_data.severity_filter:
        query = query.filter(Incident.severity.in_(query_data.severity_filter))
    if query_data.status_filter:
        query = query.filter(Incident.status.in_(query_data.status_filter))
    if query_data.incident_type_filter:
        query = query.filter(Incident.incident_type.in_(query_data.incident_type_filter))
    
    # Role-based filtering
    if not current_user.can_view_all_incidents():
        query = query.filter(Incident.reporter_id == current_user.id)
    
    # Order by distance
    query = query.order_by(
        geo_func.ST_Distance(Incident.location, search_point)
    )
    
    incidents = query.limit(50).all()
    
    return [_format_incident_summary(incident) for incident in incidents]


@router.get("/stats/overview", response_model=IncidentStats)
async def get_incident_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get incident statistics overview - FIXED VERSION"""
    
    try:
        base_query = db.query(Incident)
        
        # Role-based filtering
        if not current_user.can_view_all_incidents():
            base_query = base_query.filter(Incident.reporter_id == current_user.id)
        
        # Total incidents
        total_incidents = base_query.count()
        
        # By severity
        severity_stats = {}
        for severity in SeverityLevel:
            count = base_query.filter(Incident.severity == severity).count()
            severity_stats[severity.value] = count
        
        # By status
        status_stats = {}
        for status in IncidentStatus:
            count = base_query.filter(Incident.status == status).count()
            status_stats[status.value] = count
        
        # By type
        type_stats = {}
        for incident_type in IncidentType:
            count = base_query.filter(Incident.incident_type == incident_type).count()
            type_stats[incident_type.value] = count
        
        # Critical and resolved counts
        critical_incidents = base_query.filter(Incident.severity == SeverityLevel.CRITICAL).count()
        resolved_incidents = base_query.filter(
            Incident.status.in_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED])
        ).count()
        
        # Calculate average resolution time (in hours)
        average_resolution_time = None
        try:
            resolved_with_times = base_query.filter(
                Incident.resolved_at.isnot(None),
                Incident.created_at.isnot(None)
            ).all()
            
            if resolved_with_times:
                total_hours = 0
                count = 0
                for incident in resolved_with_times:
                    if incident.resolved_at and incident.created_at:
                        delta = incident.resolved_at - incident.created_at
                        total_hours += delta.total_seconds() / 3600
                        count += 1
                
                if count > 0:
                    average_resolution_time = round(total_hours / count, 2)
        except Exception as e:
            logger.warning(f"Could not calculate average resolution time: {e}")
        
        logger.info(f"Stats requested by user: {current_user.email} ({current_user.role})")
        
        return IncidentStats(
            total_incidents=total_incidents,
            by_severity=severity_stats,
            by_status=status_stats,
            by_type=type_stats,
            critical_incidents=critical_incidents,
            resolved_incidents=resolved_incidents,
            average_resolution_time=average_resolution_time
        )
        
    except SQLAlchemyError as e:  # NOW THIS IMPORT EXISTS
        logger.error(f"Database error in get_incident_statistics: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )
    except Exception as e:
        logger.error(f"Unexpected error in get_incident_statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/assign", response_model=dict)
async def assign_incident_to_unit(
    assignment: IncidentAssignment,
    current_user: User = Depends(require_role([UserRole.COMMAND_CENTER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Assign an incident to a rescue unit"""
    
    # Verify incident exists
    incident = db.query(Incident).filter(Incident.id == assignment.incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    # Verify rescue unit exists and is available
    rescue_unit = db.query(RescueUnit).filter(RescueUnit.id == assignment.rescue_unit_id).first()
    if not rescue_unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rescue unit not found"
        )
    
    if not rescue_unit.is_available():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rescue unit is not available"
        )
    
    # Update incident and unit
    incident.assigned_unit_id = assignment.rescue_unit_id
    incident.status = IncidentStatus.ASSIGNED
    
    # Update unit status
    rescue_unit.status = "busy"
    
    db.commit()
    
    return {
        "message": "Incident assigned successfully",
        "incident_id": incident.id,
        "unit_id": rescue_unit.id,
        "assignment_notes": assignment.notes
    }


def _format_incident_response(incident: Incident) -> IncidentResponse:
    """Format incident for response"""
    return IncidentResponse(
        id=incident.id,
        title=incident.title,
        description=incident.description,
        incident_type=incident.incident_type,
        severity=incident.severity,
        status=incident.status,
        affected_people_count=incident.affected_people_count,
        water_level=incident.water_level,
        latitude=incident.latitude,
        longitude=incident.longitude,
        address=incident.address,
        landmark=incident.landmark,
        image_url=incident.image_url,
        additional_images=json.loads(incident.additional_images) if incident.additional_images else None,
        reporter_id=incident.reporter_id,
        assigned_unit_id=incident.assigned_unit_id,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        resolved_at=incident.resolved_at,
        coordinates=incident.coordinates,
        is_critical=incident.is_critical(),
        requires_immediate_attention=incident.requires_immediate_attention(),
        severity_color=incident.get_severity_color()
    )


def _format_incident_summary(incident: Incident) -> IncidentSummary:
    """Format incident summary for lists"""
    return IncidentSummary(
        id=incident.id,
        title=incident.title,
        incident_type=incident.incident_type.value,
        severity=incident.severity.value,
        status=incident.status.value,
        affected_people_count=incident.affected_people_count,
        latitude=incident.latitude,
        longitude=incident.longitude,
        address=incident.address,
        created_at=incident.created_at,
        is_critical=incident.is_critical(),
        severity_color=incident.get_severity_color()
    )
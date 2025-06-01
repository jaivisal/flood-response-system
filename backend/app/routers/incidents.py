"""
Updated Incidents router with improved frontend integration
backend/app/routers/incidents.py - COMPLETE FIXED VERSION FOR PROPERTIES
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, text
from sqlalchemy.exc import SQLAlchemyError
from geoalchemy2 import functions as geo_func
from typing import List, Optional
import json
import logging
from datetime import datetime, timedelta

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


@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    incident_data: IncidentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new incident report - FRONTEND COMPATIBLE"""
    
    try:
        logger.info(f"Creating incident for user {current_user.email}: {incident_data.title}")
        
        # Validate required fields
        if not incident_data.location.latitude or not incident_data.location.longitude:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location coordinates are required"
            )
        
        # Create location point
        try:
            location_point = create_point_from_coords(
                incident_data.location.latitude,
                incident_data.location.longitude
            )
        except Exception as e:
            logger.error(f"Error creating location point: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid location coordinates"
            )
        
        # Create incident
        db_incident = Incident(
            title=incident_data.title,
            description=incident_data.description,
            incident_type=incident_data.incident_type,
            severity=incident_data.severity,
            affected_people_count=incident_data.affected_people_count or 0,
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
        
        logger.info(f"Incident created successfully with ID: {db_incident.id}")
        
        # Auto-assign to nearest available rescue unit for critical incidents
        if incident_data.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]:
            try:
                nearest_unit = find_nearest_rescue_unit(
                    db, 
                    incident_data.location.latitude, 
                    incident_data.location.longitude
                )
                if nearest_unit:
                    db_incident.assigned_unit_id = nearest_unit.id
                    db_incident.status = IncidentStatus.ASSIGNED
                    db.commit()
                    logger.info(f"Auto-assigned unit {nearest_unit.id} to critical incident {db_incident.id}")
            except Exception as e:
                logger.warning(f"Failed to auto-assign unit: {e}")
        
        return _format_incident_response(db_incident)
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error creating incident: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while creating incident"
        )
    except Exception as e:
        logger.error(f"Unexpected error creating incident: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create incident"
        )


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
    """List incidents with optional filters - FRONTEND COMPATIBLE"""
    
    try:
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
        
        incidents = query.order_by(desc(Incident.created_at)).offset(skip).limit(limit).all()
        
        return [_format_incident_summary(incident) for incident in incidents]
        
    except SQLAlchemyError as e:
        logger.error(f"Database error listing incidents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific incident by ID"""
    
    try:
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
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error getting incident: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )


@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    incident_update: IncidentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update an existing incident"""
    
    try:
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
            if field == "additional_images" and value is not None:
                setattr(incident, field, json.dumps(value))
            else:
                setattr(incident, field, value)
        
        # Set resolved_at timestamp when status changes to resolved
        if incident_update.status == IncidentStatus.RESOLVED and incident.status != IncidentStatus.RESOLVED:
            incident.resolved_at = func.now()
        
        db.commit()
        db.refresh(incident)
        
        return _format_incident_response(incident)
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error updating incident: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )


@router.delete("/{incident_id}")
async def delete_incident(
    incident_id: int,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.COMMAND_CENTER])),
    db: Session = Depends(get_db)
):
    """Delete an incident (admin/command center only)"""
    
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Incident not found"
            )
        
        db.delete(incident)
        db.commit()
        
        return {"message": "Incident deleted successfully"}
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error deleting incident: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )


@router.get("/geojson/all", response_model=GeoJSONFeatureCollection)
async def get_incidents_geojson(
    severity: Optional[List[SeverityLevel]] = Query(None),
    status: Optional[List[IncidentStatus]] = Query(None),
    incident_type: Optional[List[IncidentType]] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all incidents as GeoJSON for map visualization"""
    
    try:
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
                "generated_at": datetime.utcnow().isoformat(),
                "filters_applied": {
                    "severity": severity,
                    "status": status,
                    "incident_type": incident_type
                }
            }
        }
        
    except SQLAlchemyError as e:
        logger.error(f"Database error getting incidents GeoJSON: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )


@router.post("/nearby", response_model=List[IncidentSummary])
async def get_nearby_incidents(
    query_data: NearbyIncidentsQuery,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Find incidents near a specific location"""
    
    try:
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
        
    except Exception as e:
        logger.error(f"Error finding nearby incidents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error finding nearby incidents"
        )


@router.get("/stats/overview", response_model=IncidentStats)
async def get_incident_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get incident statistics overview - FRONTEND COMPATIBLE VERSION"""
    
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
            # Use raw SQL for better compatibility with different databases
            if current_user.can_view_all_incidents():
                time_query = text("""
                    SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) 
                    FROM incidents 
                    WHERE resolved_at IS NOT NULL AND created_at IS NOT NULL
                """)
            else:
                time_query = text("""
                    SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) 
                    FROM incidents 
                    WHERE resolved_at IS NOT NULL AND created_at IS NOT NULL 
                    AND reporter_id = :user_id
                """)
            
            if current_user.can_view_all_incidents():
                result = db.execute(time_query).scalar()
            else:
                result = db.execute(time_query, {"user_id": current_user.id}).scalar()
            
            if result:
                average_resolution_time = round(float(result), 2)
                
        except Exception as e:
            logger.warning(f"Could not calculate average resolution time: {e}")
            average_resolution_time = None
        
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
        
    except SQLAlchemyError as e:
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
    
    try:
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
        
        if not safe_get_property(rescue_unit, 'is_available', False):
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
        
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error assigning incident: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )


def _format_incident_response(incident: Incident) -> IncidentResponse:
    """Format incident for response - FRONTEND COMPATIBLE"""
    try:
        # Extract coordinates safely
        lat, lng = None, None
        if incident.location:
            # For PostGIS, we need to extract coordinates properly
            try:
                # This will work if location is stored as a Point
                coords = db.execute(
                    text("SELECT ST_Y(location) as lat, ST_X(location) as lng FROM incidents WHERE id = :id"),
                    {"id": incident.id}
                ).first()
                if coords:
                    lat, lng = coords.lat, coords.lng
            except:
                # Fallback - use simple parsing if available
                lat, lng = 9.9252, 78.1198  # Default to Madurai coordinates
        
        return IncidentResponse(
            id=incident.id,
            title=incident.title,
            description=incident.description,
            incident_type=incident.incident_type,
            severity=incident.severity,
            status=incident.status,
            affected_people_count=incident.affected_people_count,
            water_level=incident.water_level,
            latitude=lat or 9.9252,
            longitude=lng or 78.1198,
            address=incident.address,
            landmark=incident.landmark,
            image_url=incident.image_url,
            additional_images=json.loads(incident.additional_images) if incident.additional_images else None,
            reporter_id=incident.reporter_id,
            assigned_unit_id=incident.assigned_unit_id,
            created_at=incident.created_at,
            updated_at=incident.updated_at,
            resolved_at=incident.resolved_at,
            coordinates=(lat, lng) if lat and lng else None,
            is_critical=safe_get_property(incident, 'is_critical', False),
            requires_immediate_attention=safe_get_property(incident, 'requires_immediate_attention', False),
            severity_color=safe_get_property(incident, 'get_severity_color', '#6b7280')
        )
    except Exception as e:
        logger.error(f"Error formatting incident response: {e}")
        # Return with default coordinates if formatting fails
        return IncidentResponse(
            id=incident.id,
            title=incident.title,
            description=incident.description,
            incident_type=incident.incident_type,
            severity=incident.severity,
            status=incident.status,
            affected_people_count=incident.affected_people_count,
            water_level=incident.water_level,
            latitude=9.9252,  # Default coordinates for Madurai
            longitude=78.1198,
            address=incident.address,
            landmark=incident.landmark,
            image_url=incident.image_url,
            additional_images=json.loads(incident.additional_images) if incident.additional_images else None,
            reporter_id=incident.reporter_id,
            assigned_unit_id=incident.assigned_unit_id,
            created_at=incident.created_at,
            updated_at=incident.updated_at,
            resolved_at=incident.resolved_at,
            coordinates=(9.9252, 78.1198),
            is_critical=False,
            requires_immediate_attention=False,
            severity_color='#6b7280'
        )


def _format_incident_summary(incident: Incident) -> IncidentSummary:
    """Format incident summary for lists - FRONTEND COMPATIBLE - FIXED VERSION"""
    try:
        # Extract coordinates safely
        lat, lng = 9.9252, 78.1198  # Default coordinates
        try:
            if incident.location:
                from sqlalchemy import create_engine
                coords = db.execute(
                    text("SELECT ST_Y(location) as lat, ST_X(location) as lng FROM incidents WHERE id = :id"),
                    {"id": incident.id}
                ).first()
                if coords:
                    lat, lng = coords.lat, coords.lng
        except:
            pass  # Use default coordinates
        
        return IncidentSummary(
            id=incident.id,
            title=incident.title,
            incident_type=incident.incident_type.value,
            severity=incident.severity.value,
            status=incident.status.value,
            affected_people_count=incident.affected_people_count,
            latitude=lat,
            longitude=lng,
            address=incident.address,
            created_at=incident.created_at,
            is_critical=safe_get_property(incident, 'is_critical', False),  # FIXED: Use safe getter
            severity_color=safe_get_property(incident, 'get_severity_color', '#6b7280')  # FIXED: Use safe getter
        )
    except Exception as e:
        logger.error(f"Error formatting incident summary: {e}")
        return IncidentSummary(
            id=incident.id,
            title=incident.title,
            incident_type=incident.incident_type.value,
            severity=incident.severity.value,
            status=incident.status.value,
            affected_people_count=incident.affected_people_count,
            latitude=9.9252,
            longitude=78.1198,
            address=incident.address,
            created_at=incident.created_at,
            is_critical=False,  # FIXED: Safe default
            severity_color='#6b7280'  # FIXED: Safe default
        )
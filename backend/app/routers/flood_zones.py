"""
Updated Flood Zones router for Emergency Flood Response System
backend/app/routers/flood_zones.py - FIXED VERSION FOR FRONTEND INTEGRATION
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, text
from geoalchemy2 import functions as geo_func
from typing import List, Optional
import json
import logging

from app.database import get_db
from app.models.user import User, UserRole
from app.models.flood_zone import FloodZone, RiskLevel, ZoneType
from app.schemas.flood_zone import (
    FloodZoneCreate, FloodZoneUpdate, FloodZoneResponse, FloodZoneSummary,
    FloodZoneStats, GeoJSONFeatureCollection, RiskAssessmentUpdate,
    EvacuationOrder, ZoneAlert
)
from app.routers.auth import get_current_active_user, require_role
from app.services.gis_service import create_point_from_coords

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=FloodZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_flood_zone(
    zone_data: FloodZoneCreate,
    current_user: User = Depends(require_role([UserRole.DISTRICT_OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Create a new flood zone (District Officer/Admin only)"""
    
    try:
        # Check if zone code already exists
        existing_zone = db.query(FloodZone).filter(FloodZone.zone_code == zone_data.zone_code).first()
        if existing_zone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Zone code already exists"
            )
        
        # Create flood zone with proper coordinate handling
        db_zone = FloodZone(
            name=zone_data.name,
            description=zone_data.description,
            zone_code=zone_data.zone_code,
            risk_level=zone_data.risk_level,
            zone_type=zone_data.zone_type,
            center_latitude=zone_data.center_latitude,
            center_longitude=zone_data.center_longitude,
            area_sqkm=zone_data.area_sqkm,
            population_estimate=zone_data.population_estimate,
            residential_units=zone_data.residential_units,
            commercial_units=zone_data.commercial_units,
            district=zone_data.district,
            municipality=zone_data.municipality,
            responsible_officer=zone_data.responsible_officer,
            emergency_contact=zone_data.emergency_contact
        )
        
        # Set critical infrastructure
        if zone_data.critical_infrastructure:
            db_zone.set_critical_infrastructure_list(zone_data.critical_infrastructure)
        
        # Create center point geometry if coordinates provided
        if zone_data.center_latitude and zone_data.center_longitude:
            center_point = create_point_from_coords(
                zone_data.center_latitude,
                zone_data.center_longitude
            )
            db_zone.center_point = center_point
        
        db.add(db_zone)
        db.commit()
        db.refresh(db_zone)
        
        logger.info(f"Created flood zone: {db_zone.name} ({db_zone.zone_code})")
        return _format_zone_response(db_zone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating flood zone: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create flood zone"
        )


@router.get("/", response_model=List[FloodZoneSummary])
async def list_flood_zones(
    skip: int = 0,
    limit: int = 100,
    risk_level: Optional[RiskLevel] = None,
    zone_type: Optional[ZoneType] = None,
    district: Optional[str] = None,
    is_flooded: Optional[bool] = None,
    requires_evacuation: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List flood zones with optional filters"""
    
    try:
        query = db.query(FloodZone)
        
        # Apply filters
        if risk_level:
            query = query.filter(FloodZone.risk_level == risk_level)
        if zone_type:
            query = query.filter(FloodZone.zone_type == zone_type)
        if district:
            query = query.filter(FloodZone.district.ilike(f"%{district}%"))
        if is_flooded is not None:
            query = query.filter(FloodZone.is_currently_flooded == is_flooded)
        if requires_evacuation is not None:
            if requires_evacuation:
                query = query.filter(
                    or_(
                        FloodZone.evacuation_recommended == True,
                        FloodZone.evacuation_mandatory == True
                    )
                )
            else:
                query = query.filter(
                    and_(
                        FloodZone.evacuation_recommended == False,
                        FloodZone.evacuation_mandatory == False
                    )
                )
        
        # Order by priority score (high to low)
        try:
            zones = query.order_by(desc(FloodZone.priority_score)).offset(skip).limit(limit).all()
        except Exception:
            # Fallback if priority_score calculation fails
            zones = query.order_by(desc(FloodZone.created_at)).offset(skip).limit(limit).all()
        
        logger.info(f"Retrieved {len(zones)} flood zones")
        return [_format_zone_summary(zone) for zone in zones]
        
    except Exception as e:
        logger.error(f"Error listing flood zones: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve flood zones"
        )


@router.get("/{zone_id}", response_model=FloodZoneResponse)
async def get_flood_zone(
    zone_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific flood zone by ID"""
    
    try:
        zone = db.query(FloodZone).filter(FloodZone.id == zone_id).first()
        if not zone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flood zone not found"
            )
        
        return _format_zone_response(zone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting flood zone {zone_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve flood zone"
        )


@router.put("/{zone_id}", response_model=FloodZoneResponse)
async def update_flood_zone(
    zone_id: int,
    zone_update: FloodZoneUpdate,
    current_user: User = Depends(require_role([UserRole.DISTRICT_OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Update an existing flood zone"""
    
    try:
        zone = db.query(FloodZone).filter(FloodZone.id == zone_id).first()
        if not zone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flood zone not found"
            )
        
        # Update basic fields
        update_data = zone_update.dict(exclude_unset=True, exclude={'critical_infrastructure'})
        for field, value in update_data.items():
            setattr(zone, field, value)
        
        # Handle critical infrastructure separately
        if zone_update.critical_infrastructure is not None:
            zone.set_critical_infrastructure_list(zone_update.critical_infrastructure)
        
        # Update center point if coordinates changed
        if hasattr(zone_update, 'center_latitude') and hasattr(zone_update, 'center_longitude'):
            if zone_update.center_latitude and zone_update.center_longitude:
                center_point = create_point_from_coords(
                    zone_update.center_latitude,
                    zone_update.center_longitude
                )
                zone.center_point = center_point
        
        zone.updated_at = func.now()
        db.commit()
        db.refresh(zone)
        
        logger.info(f"Updated flood zone: {zone.name} ({zone.zone_code})")
        return _format_zone_response(zone)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating flood zone {zone_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update flood zone"
        )


@router.delete("/{zone_id}")
async def delete_flood_zone(
    zone_id: int,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Delete a flood zone (Admin only)"""
    
    try:
        zone = db.query(FloodZone).filter(FloodZone.id == zone_id).first()
        if not zone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flood zone not found"
            )
        
        zone_name = zone.name
        db.delete(zone)
        db.commit()
        
        logger.info(f"Deleted flood zone: {zone_name}")
        return {"message": "Flood zone deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting flood zone {zone_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete flood zone"
        )


@router.get("/geojson/all", response_model=GeoJSONFeatureCollection)
async def get_flood_zones_geojson(
    risk_levels: Optional[List[RiskLevel]] = Query(None),
    zone_types: Optional[List[ZoneType]] = Query(None),
    is_flooded: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all flood zones as GeoJSON for map visualization"""
    
    try:
        query = db.query(FloodZone)
        
        # Apply filters
        if risk_levels:
            query = query.filter(FloodZone.risk_level.in_(risk_levels))
        if zone_types:
            query = query.filter(FloodZone.zone_type.in_(zone_types))
        if is_flooded is not None:
            query = query.filter(FloodZone.is_currently_flooded == is_flooded)
        
        zones = query.limit(1000).all()  # Limit for performance
        
        features = []
        for zone in zones:
            try:
                feature = zone.to_geojson_feature()
                if feature and feature.get('geometry'):
                    features.append(feature)
            except Exception as e:
                logger.warning(f"Failed to convert zone {zone.id} to GeoJSON: {e}")
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "total_features": len(features),
                "generated_at": func.now(),
                "filters_applied": {
                    "risk_levels": risk_levels,
                    "zone_types": zone_types,
                    "is_flooded": is_flooded
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating GeoJSON: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate GeoJSON data"
        )


@router.get("/stats/overview", response_model=FloodZoneStats)
async def get_flood_zone_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get flood zone statistics overview"""
    
    try:
        # Total zones
        total_zones = db.query(FloodZone).count()
        
        # By risk level
        risk_stats = {}
        for risk in RiskLevel:
            count = db.query(FloodZone).filter(FloodZone.risk_level == risk).count()
            risk_stats[risk.value] = count
        
        # By zone type
        type_stats = {}
        for zone_type in ZoneType:
            count = db.query(FloodZone).filter(FloodZone.zone_type == zone_type).count()
            type_stats[zone_type.value] = count
        
        # Critical conditions
        currently_flooded = db.query(FloodZone).filter(FloodZone.is_currently_flooded == True).count()
        evacuation_recommended = db.query(FloodZone).filter(FloodZone.evacuation_recommended == True).count()
        evacuation_mandatory = db.query(FloodZone).filter(FloodZone.evacuation_mandatory == True).count()
        high_risk_zones = db.query(FloodZone).filter(
            FloodZone.risk_level.in_([RiskLevel.HIGH, RiskLevel.VERY_HIGH, RiskLevel.EXTREME])
        ).count()
        
        # Population at risk
        population_at_risk = db.query(func.sum(FloodZone.population_estimate)).filter(
            FloodZone.risk_level.in_([RiskLevel.HIGH, RiskLevel.VERY_HIGH, RiskLevel.EXTREME])
        ).scalar() or 0
        
        stats = FloodZoneStats(
            total_zones=total_zones,
            by_risk_level=risk_stats,
            by_zone_type=type_stats,
            currently_flooded=currently_flooded,
            evacuation_recommended=evacuation_recommended,
            evacuation_mandatory=evacuation_mandatory,
            high_risk_zones=high_risk_zones,
            population_at_risk=population_at_risk
        )
        
        logger.info(f"Generated flood zone statistics: {total_zones} total zones")
        return stats
        
    except Exception as e:
        logger.error(f"Error generating flood zone statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate statistics"
        )


@router.post("/{zone_id}/risk-assessment", response_model=dict)
async def update_risk_assessment(
    zone_id: int,
    assessment: RiskAssessmentUpdate,
    current_user: User = Depends(require_role([UserRole.DISTRICT_OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Update risk assessment for a flood zone"""
    
    try:
        zone = db.query(FloodZone).filter(FloodZone.id == zone_id).first()
        if not zone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flood zone not found"
            )
        
        # Update risk assessment
        zone.risk_level = assessment.risk_level
        zone.current_water_level = assessment.current_water_level
        zone.is_currently_flooded = assessment.is_currently_flooded
        zone.last_assessment = func.now()
        
        # Update max recorded water level if needed
        if assessment.current_water_level and (
            not zone.max_recorded_water_level or 
            assessment.current_water_level > zone.max_recorded_water_level
        ):
            zone.max_recorded_water_level = assessment.current_water_level
        
        db.commit()
        
        logger.info(f"Updated risk assessment for zone {zone.name}: {assessment.risk_level}")
        
        return {
            "message": "Risk assessment updated successfully",
            "zone_id": zone_id,
            "new_risk_level": assessment.risk_level.value,
            "assessment_time": zone.last_assessment.isoformat() if zone.last_assessment else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating risk assessment for zone {zone_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update risk assessment"
        )


@router.post("/{zone_id}/evacuation-order", response_model=dict)
async def issue_evacuation_order(
    zone_id: int,
    order: EvacuationOrder,
    current_user: User = Depends(require_role([UserRole.DISTRICT_OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Issue evacuation order for a flood zone"""
    
    try:
        zone = db.query(FloodZone).filter(FloodZone.id == zone_id).first()
        if not zone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flood zone not found"
            )
        
        # Update evacuation status
        zone.evacuation_recommended = order.evacuation_recommended
        zone.evacuation_mandatory = order.evacuation_mandatory
        
        db.commit()
        
        # Determine evacuation type for response
        evacuation_type = "mandatory" if order.evacuation_mandatory else "recommended" if order.evacuation_recommended else "lifted"
        
        logger.info(f"Issued {evacuation_type} evacuation order for zone {zone.name}")
        
        return {
            "message": f"Evacuation order {evacuation_type} for zone {zone.name}",
            "zone_id": zone_id,
            "zone_name": zone.name,
            "evacuation_type": evacuation_type,
            "reason": order.reason,
            "issued_by": current_user.full_name,
            "issued_at": func.now()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error issuing evacuation order for zone {zone_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to issue evacuation order"
        )


@router.get("/high-risk/list", response_model=List[FloodZoneSummary])
async def get_high_risk_zones(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all high-risk flood zones requiring attention"""
    
    try:
        zones = db.query(FloodZone).filter(
            or_(
                FloodZone.risk_level.in_([RiskLevel.HIGH, RiskLevel.VERY_HIGH, RiskLevel.EXTREME]),
                FloodZone.is_currently_flooded == True,
                FloodZone.evacuation_mandatory == True
            )
        ).all()
        
        # Sort by priority score if possible
        try:
            zones = sorted(zones, key=lambda z: z.get_priority_score(), reverse=True)
        except Exception:
            # Fallback sort by risk level
            risk_order = {RiskLevel.EXTREME: 6, RiskLevel.VERY_HIGH: 5, RiskLevel.HIGH: 4, 
                         RiskLevel.MEDIUM: 3, RiskLevel.LOW: 2, RiskLevel.VERY_LOW: 1}
            zones = sorted(zones, key=lambda z: risk_order.get(z.risk_level, 0), reverse=True)
        
        logger.info(f"Retrieved {len(zones)} high-risk zones")
        return [_format_zone_summary(zone) for zone in zones]
        
    except Exception as e:
        logger.error(f"Error getting high-risk zones: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve high-risk zones"
        )


@router.get("/alerts/active", response_model=List[ZoneAlert])
async def get_active_zone_alerts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get active alerts for flood zones"""
    
    try:
        alerts = []
        
        # Critical zones
        critical_zones = db.query(FloodZone).filter(
            FloodZone.risk_level == RiskLevel.EXTREME
        ).all()
        
        for zone in critical_zones:
            alerts.append(ZoneAlert(
                zone_id=zone.id,
                zone_name=zone.name,
                alert_type="critical_risk",
                severity="critical",
                message=f"Zone {zone.name} is at EXTREME risk level",
                created_at=zone.last_assessment or zone.created_at
            ))
        
        # Currently flooded zones
        flooded_zones = db.query(FloodZone).filter(
            FloodZone.is_currently_flooded == True
        ).all()
        
        for zone in flooded_zones:
            alerts.append(ZoneAlert(
                zone_id=zone.id,
                zone_name=zone.name,
                alert_type="flooding_active",
                severity="high",
                message=f"Active flooding reported in {zone.name}",
                created_at=zone.last_assessment or zone.created_at
            ))
        
        # Mandatory evacuations
        evacuation_zones = db.query(FloodZone).filter(
            FloodZone.evacuation_mandatory == True
        ).all()
        
        for zone in evacuation_zones:
            alerts.append(ZoneAlert(
                zone_id=zone.id,
                zone_name=zone.name,
                alert_type="evacuation_mandatory",
                severity="critical",
                message=f"Mandatory evacuation ordered for {zone.name}",
                created_at=zone.last_assessment or zone.created_at
            ))
        
        # Sort by severity and time
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        alerts.sort(key=lambda x: (severity_order.get(x.severity, 99), x.created_at), reverse=True)
        
        logger.info(f"Generated {len(alerts)} active zone alerts")
        return alerts
        
    except Exception as e:
        logger.error(f"Error generating zone alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate zone alerts"
        )


# Helper functions for response formatting
def _format_zone_response(zone: FloodZone) -> FloodZoneResponse:
    """Format flood zone for detailed response"""
    try:
        return FloodZoneResponse(
            id=zone.id,
            name=zone.name,
            description=zone.description,
            zone_code=zone.zone_code,
            risk_level=zone.risk_level,
            zone_type=zone.zone_type,
            center_latitude=zone.center_latitude,
            center_longitude=zone.center_longitude,
            area_sqkm=zone.area_sqkm,
            population_estimate=zone.population_estimate,
            residential_units=zone.residential_units,
            commercial_units=zone.commercial_units,
            critical_infrastructure=zone.get_critical_infrastructure_list(),
            last_major_flood=zone.last_major_flood,
            flood_frequency_years=zone.flood_frequency_years,
            max_recorded_water_level=zone.max_recorded_water_level,
            current_water_level=zone.current_water_level,
            is_currently_flooded=zone.is_currently_flooded,
            evacuation_recommended=zone.evacuation_recommended,
            evacuation_mandatory=zone.evacuation_mandatory,
            district=zone.district,
            municipality=zone.municipality,
            responsible_officer=zone.responsible_officer,
            emergency_contact=zone.emergency_contact,
            created_at=zone.created_at,
            updated_at=zone.updated_at,
            last_assessment=zone.last_assessment,
            color=zone.get_risk_color(),
            opacity=zone.get_risk_opacity(),
            priority_score=zone.get_priority_score(),
            is_critical=zone.is_critical()
        )
    except Exception as e:
        logger.error(f"Error formatting zone response for zone {zone.id}: {e}")
        # Return minimal response on error
        return FloodZoneResponse(
            id=zone.id,
            name=zone.name,
            description=zone.description,
            zone_code=zone.zone_code,
            risk_level=zone.risk_level,
            zone_type=zone.zone_type,
            population_estimate=zone.population_estimate,
            residential_units=zone.residential_units,
            commercial_units=zone.commercial_units,
            is_currently_flooded=zone.is_currently_flooded,
            evacuation_recommended=zone.evacuation_recommended,
            evacuation_mandatory=zone.evacuation_mandatory,
            created_at=zone.created_at,
            color=zone.get_risk_color(),
            opacity=zone.get_risk_opacity(),
            priority_score=zone.get_priority_score(),
            is_critical=zone.is_critical()
        )


def _format_zone_summary(zone: FloodZone) -> FloodZoneSummary:
    """Format flood zone summary for lists"""
    try:
        return FloodZoneSummary(
            id=zone.id,
            name=zone.name,
            zone_code=zone.zone_code,
            risk_level=zone.risk_level.value,
            zone_type=zone.zone_type.value,
            population_estimate=zone.population_estimate,
            area_sqkm=zone.area_sqkm,
            is_currently_flooded=zone.is_currently_flooded,
            evacuation_recommended=zone.evacuation_recommended,
            evacuation_mandatory=zone.evacuation_mandatory,
            district=zone.district,
            municipality=zone.municipality,
            color=zone.get_risk_color(),
            priority_score=zone.get_priority_score(),
            is_critical=zone.is_critical(),
            last_assessment=zone.last_assessment
        )
    except Exception as e:
        logger.error(f"Error formatting zone summary for zone {zone.id}: {e}")
        # Return minimal summary on error
        return FloodZoneSummary(
            id=zone.id,
            name=zone.name,
            zone_code=zone.zone_code,
            risk_level=zone.risk_level.value,
            zone_type=zone.zone_type.value,
            population_estimate=zone.population_estimate,
            is_currently_flooded=zone.is_currently_flooded,
            evacuation_recommended=zone.evacuation_recommended,
            evacuation_mandatory=zone.evacuation_mandatory,
            color=zone.get_risk_color(),
            priority_score=zone.get_priority_score(),
            is_critical=zone.is_critical()
        )
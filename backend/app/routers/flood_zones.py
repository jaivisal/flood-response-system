"""
Fixed Flood Zones router for risk assessment and zone management
backend/app/routers/flood_zones.py - FIXED VERSION
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from geoalchemy2 import functions as geo_func
from typing import List, Optional
import json

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
from app.utils.flood_zones import calculate_zone_coverage

router = APIRouter()


@router.post("/", response_model=FloodZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_flood_zone(
    zone_data: FloodZoneCreate,
    current_user: User = Depends(require_role([UserRole.DISTRICT_OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Create a new flood zone (District Officer/Admin only)"""
    
    # Check if zone code already exists
    existing_zone = db.query(FloodZone).filter(FloodZone.zone_code == zone_data.zone_code).first()
    if existing_zone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zone code already exists"
        )
    
    # Create zone boundary from coordinates
    # For simplicity, using the center point - in production, you'd handle actual polygon data
    zone_boundary = create_point_from_coords(
        zone_data.center_latitude,
        zone_data.center_longitude
    )
    
    center_point = create_point_from_coords(
        zone_data.center_latitude,
        zone_data.center_longitude
    )
    
    # Create flood zone
    db_zone = FloodZone(
        name=zone_data.name,
        description=zone_data.description,
        zone_code=zone_data.zone_code,
        risk_level=zone_data.risk_level,
        zone_type=zone_data.zone_type,
        zone_boundary=zone_boundary,
        center_point=center_point,
        area_sqkm=zone_data.area_sqkm,
        population_estimate=zone_data.population_estimate,
        residential_units=zone_data.residential_units,
        commercial_units=zone_data.commercial_units,
        critical_infrastructure=json.dumps(zone_data.critical_infrastructure) if zone_data.critical_infrastructure else None,
        district=zone_data.district,
        municipality=zone_data.municipality,
        responsible_officer=zone_data.responsible_officer,
        emergency_contact=zone_data.emergency_contact
    )
    
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    
    return _format_zone_response(db_zone)


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
    """List flood zones with optional filters - FIXED VERSION"""
    
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
    
    # Order by priority score using the hybrid property - FIXED
    zones = query.order_by(desc(FloodZone.priority_score)).offset(skip).limit(limit).all()
    
    return [_format_zone_summary(zone) for zone in zones]


@router.get("/{zone_id}", response_model=FloodZoneResponse)
async def get_flood_zone(
    zone_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific flood zone by ID"""
    
    zone = db.query(FloodZone).filter(FloodZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flood zone not found"
        )
    
    return _format_zone_response(zone)


@router.put("/{zone_id}", response_model=FloodZoneResponse)
async def update_flood_zone(
    zone_id: int,
    zone_update: FloodZoneUpdate,
    current_user: User = Depends(require_role([UserRole.DISTRICT_OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Update an existing flood zone"""
    
    zone = db.query(FloodZone).filter(FloodZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flood zone not found"
        )
    
    # Update fields
    update_data = zone_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "critical_infrastructure" and value is not None:
            setattr(zone, field, json.dumps(value))
        else:
            setattr(zone, field, value)
    
    db.commit()
    db.refresh(zone)
    
    return _format_zone_response(zone)


@router.delete("/{zone_id}")
async def delete_flood_zone(
    zone_id: int,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Delete a flood zone (Admin only)"""
    
    zone = db.query(FloodZone).filter(FloodZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flood zone not found"
        )
    
    db.delete(zone)
    db.commit()
    
    return {"message": "Flood zone deleted successfully"}


@router.get("/geojson/all", response_model=GeoJSONFeatureCollection)
async def get_flood_zones_geojson(
    risk_levels: Optional[List[RiskLevel]] = Query(None),
    zone_types: Optional[List[ZoneType]] = Query(None),
    is_flooded: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all flood zones as GeoJSON for map visualization"""
    
    query = db.query(FloodZone)
    
    # Apply filters
    if risk_levels:
        query = query.filter(FloodZone.risk_level.in_(risk_levels))
    if zone_types:
        query = query.filter(FloodZone.zone_type.in_(zone_types))
    if is_flooded is not None:
        query = query.filter(FloodZone.is_currently_flooded == is_flooded)
    
    zones = query.limit(1000).all()  # Limit for performance
    
    features = [zone.to_geojson_feature() for zone in zones]
    
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


@router.get("/stats/overview", response_model=FloodZoneStats)
async def get_flood_zone_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get flood zone statistics overview"""
    
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
    
    return FloodZoneStats(
        total_zones=total_zones,
        by_risk_level=risk_stats,
        by_zone_type=type_stats,
        currently_flooded=currently_flooded,
        evacuation_recommended=evacuation_recommended,
        evacuation_mandatory=evacuation_mandatory,
        high_risk_zones=high_risk_zones,
        population_at_risk=population_at_risk
    )


@router.post("/{zone_id}/risk-assessment", response_model=dict)
async def update_risk_assessment(
    zone_id: int,
    assessment: RiskAssessmentUpdate,
    current_user: User = Depends(require_role([UserRole.DISTRICT_OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Update risk assessment for a flood zone"""
    
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
    
    return {
        "message": "Risk assessment updated successfully",
        "zone_id": zone_id,
        "new_risk_level": assessment.risk_level.value,
        "assessment_time": zone.last_assessment
    }


@router.post("/{zone_id}/evacuation-order", response_model=dict)
async def issue_evacuation_order(
    zone_id: int,
    order: EvacuationOrder,
    current_user: User = Depends(require_role([UserRole.DISTRICT_OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    """Issue evacuation order for a flood zone"""
    
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
    
    # In a real system, this would trigger alerts to residents
    evacuation_type = "mandatory" if order.evacuation_mandatory else "recommended" if order.evacuation_recommended else "lifted"
    
    return {
        "message": f"Evacuation order {evacuation_type} for zone {zone.name}",
        "zone_id": zone_id,
        "zone_name": zone.name,
        "evacuation_type": evacuation_type,
        "reason": order.reason,
        "issued_by": current_user.full_name,
        "issued_at": func.now()
    }


@router.get("/high-risk/list", response_model=List[FloodZoneSummary])
async def get_high_risk_zones(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all high-risk flood zones requiring attention - FIXED VERSION"""
    
    zones = db.query(FloodZone).filter(
        or_(
            FloodZone.risk_level.in_([RiskLevel.HIGH, RiskLevel.VERY_HIGH, RiskLevel.EXTREME]),
            FloodZone.is_currently_flooded == True,
            FloodZone.evacuation_mandatory == True
        )
    ).order_by(desc(FloodZone.priority_score)).all()
    
    return [_format_zone_summary(zone) for zone in zones]


@router.get("/alerts/active", response_model=List[ZoneAlert])
async def get_active_zone_alerts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get active alerts for flood zones"""
    
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
    
    return alerts


def _format_zone_response(zone: FloodZone) -> FloodZoneResponse:
    """Format flood zone for detailed response"""
    return FloodZoneResponse(
        id=zone.id,
        name=zone.name,
        description=zone.description,
        zone_code=zone.zone_code,
        risk_level=zone.risk_level,
        zone_type=zone.zone_type,
        area_sqkm=zone.area_sqkm,
        population_estimate=zone.population_estimate,
        residential_units=zone.residential_units,
        commercial_units=zone.commercial_units,
        critical_infrastructure=json.loads(zone.critical_infrastructure) if zone.critical_infrastructure else None,
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
        priority_score=zone.get_priority_score(),  # Use the Python method
        is_critical=zone.is_critical()
    )


def _format_zone_summary(zone: FloodZone) -> FloodZoneSummary:
    """Format flood zone summary for lists"""
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
        priority_score=zone.get_priority_score(),  # Use the Python method
        is_critical=zone.is_critical(),
        last_assessment=zone.last_assessment
    )
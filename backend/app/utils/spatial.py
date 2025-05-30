"""
Spatial utility functions for rescue unit and incident management
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2.functions import ST_Distance, ST_DWithin
from typing import Optional, List, Tuple

from app.models.rescue_unit import RescueUnit, UnitStatus
from app.models.incident import Incident
from app.services.gis_service import create_point_from_coords


def find_nearest_rescue_unit(
    db: Session, 
    latitude: float, 
    longitude: float, 
    radius_km: float = 50.0,
    unit_types: Optional[List[str]] = None
) -> Optional[RescueUnit]:
    """
    Find the nearest available rescue unit to a location
    """
    location_point = create_point_from_coords(latitude, longitude)
    
    # Base query for available units
    query = db.query(RescueUnit).filter(
        RescueUnit.status == UnitStatus.AVAILABLE
    )
    
    # Filter by unit types if specified
    if unit_types:
        query = query.filter(RescueUnit.unit_type.in_(unit_types))
    
    # Filter by radius
    query = query.filter(
        ST_DWithin(
            RescueUnit.location,
            location_point,
            radius_km * 1000  # Convert km to meters
        )
    )
    
    # Order by distance and get the nearest
    nearest_unit = query.order_by(
        ST_Distance(RescueUnit.location, location_point)
    ).first()
    
    return nearest_unit


def find_nearby_rescue_units(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 25.0,
    limit: int = 10,
    available_only: bool = True
) -> List[Tuple[RescueUnit, float]]:
    """
    Find nearby rescue units with their distances
    Returns list of (unit, distance_km) tuples
    """
    location_point = create_point_from_coords(latitude, longitude)
    
    query = db.query(
        RescueUnit,
        ST_Distance(RescueUnit.location, location_point).label('distance')
    )
    
    if available_only:
        query = query.filter(RescueUnit.status == UnitStatus.AVAILABLE)
    
    # Filter by radius
    query = query.filter(
        ST_DWithin(
            RescueUnit.location,
            location_point,
            radius_km * 1000
        )
    )
    
    # Order by distance
    results = query.order_by('distance').limit(limit).all()
    
    # Convert distance from meters to kilometers and return
    return [(unit, distance / 1000.0) for unit, distance in results]


def calculate_response_time(
    unit_location: Tuple[float, float],
    incident_location: Tuple[float, float],
    average_speed_kmh: float = 50.0
) -> float:
    """
    Calculate estimated response time in minutes
    """
    from app.services.gis_service import calculate_distance
    
    distance_km = calculate_distance(
        unit_location[0], unit_location[1],
        incident_location[0], incident_location[1]
    )
    
    # Calculate time in hours, then convert to minutes
    time_hours = distance_km / average_speed_kmh
    time_minutes = time_hours * 60
    
    return time_minutes


def get_coverage_area_incidents(
    db: Session,
    unit: RescueUnit,
    coverage_radius_km: float = 25.0
) -> List[Incident]:
    """
    Get all incidents within a rescue unit's coverage area
    """
    # Get incidents within coverage radius
    incidents = db.query(Incident).filter(
        ST_DWithin(
            Incident.location,
            unit.location,
            coverage_radius_km * 1000
        ),
        Incident.status.in_(['reported', 'assigned'])
    ).order_by(
        ST_Distance(Incident.location, unit.location)
    ).all()
    
    return incidents


def optimize_unit_assignments(
    db: Session,
    incidents: List[Incident],
    max_radius_km: float = 50.0
) -> List[Tuple[Incident, Optional[RescueUnit]]]:
    """
    Optimize assignment of rescue units to incidents
    Simple greedy algorithm - for production, use more sophisticated optimization
    """
    assignments = []
    used_units = set()
    
    # Sort incidents by priority (critical first)
    sorted_incidents = sorted(
        incidents,
        key=lambda x: (
            x.severity == 'critical',
            x.severity == 'high',
            x.affected_people_count
        ),
        reverse=True
    )
    
    for incident in sorted_incidents:
        if not incident.latitude or not incident.longitude:
            assignments.append((incident, None))
            continue
        
        # Find available units not already assigned
        available_units_query = db.query(RescueUnit).filter(
            RescueUnit.status == UnitStatus.AVAILABLE,
            ~RescueUnit.id.in_(used_units)
        )
        
        # Get nearest available unit
        location_point = create_point_from_coords(incident.latitude, incident.longitude)
        
        nearest_unit = available_units_query.filter(
            ST_DWithin(
                RescueUnit.location,
                location_point,
                max_radius_km * 1000
            )
        ).order_by(
            ST_Distance(RescueUnit.location, location_point)
        ).first()
        
        if nearest_unit:
            used_units.add(nearest_unit.id)
            assignments.append((incident, nearest_unit))
        else:
            assignments.append((incident, None))
    
    return assignments


def get_unit_workload_distribution(db: Session) -> dict:
    """
    Get workload distribution across rescue units
    """
    # Count assigned incidents per unit
    workload_query = db.query(
        RescueUnit.id,
        RescueUnit.unit_name,
        func.count(Incident.id).label('incident_count')
    ).outerjoin(
        Incident,
        RescueUnit.id == Incident.assigned_unit_id
    ).filter(
        Incident.status.in_(['assigned', 'in_progress'])
    ).group_by(
        RescueUnit.id,
        RescueUnit.unit_name
    ).all()
    
    return {
        unit_name: incident_count 
        for unit_id, unit_name, incident_count in workload_query
    }


def check_coverage_gaps(
    db: Session,
    grid_size_km: float = 10.0,
    coverage_radius_km: float = 25.0
) -> List[Tuple[float, float]]:
    """
    Identify areas with poor rescue unit coverage
    Returns list of (lat, lng) coordinates with coverage gaps
    """
    # This is a simplified implementation
    # In production, you'd use a proper grid-based analysis
    
    # Get all active rescue units
    units = db.query(RescueUnit).filter(
        RescueUnit.status != UnitStatus.OFFLINE
    ).all()
    
    if not units:
        return []
    
    # Get bounding box of all units
    unit_coords = [(unit.latitude, unit.longitude) for unit in units if unit.latitude and unit.longitude]
    
    if not unit_coords:
        return []
    
    min_lat = min(coord[0] for coord in unit_coords) - 0.5
    max_lat = max(coord[0] for coord in unit_coords) + 0.5
    min_lng = min(coord[1] for coord in unit_coords) - 0.5
    max_lng = max(coord[1] for coord in unit_coords) + 0.5
    
    # Check grid points for coverage
    coverage_gaps = []
    lat_step = grid_size_km / 111.0  # Approximate degrees per km
    lng_step = grid_size_km / (111.0 * 0.8)  # Adjust for latitude
    
    lat = min_lat
    while lat <= max_lat:
        lng = min_lng
        while lng <= max_lng:
            # Check if this point is covered by any unit
            covered = False
            for unit in units:
                if unit.latitude and unit.longitude:
                    from app.services.gis_service import calculate_distance
                    distance = calculate_distance(lat, lng, unit.latitude, unit.longitude)
                    if distance <= coverage_radius_km:
                        covered = True
                        break
            
            if not covered:
                coverage_gaps.append((lat, lng))
            
            lng += lng_step
        lat += lat_step
    
    return coverage_gaps
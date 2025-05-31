"""
Flood zone utility functions
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional


def calculate_zone_coverage(
    db: Session,
    zone_geometry,
    affected_area_geometry
) -> float:
    """
    Calculate the coverage percentage of a flood zone within an affected area
    Returns percentage (0-100)
    """
    try:
        if not zone_geometry or not affected_area_geometry:
            return 0.0
        
        # Calculate intersection area
        intersection_area = db.execute(
            func.ST_Area(
                func.ST_Intersection(zone_geometry, affected_area_geometry)
            )
        ).scalar()
        
        # Calculate zone area
        zone_area = db.execute(
            func.ST_Area(zone_geometry)
        ).scalar()
        
        if zone_area == 0:
            return 0.0
        
        # Calculate coverage percentage
        coverage = (intersection_area / zone_area) * 100
        return min(coverage, 100.0)
        
    except Exception as e:
        print(f"Error calculating zone coverage: {e}")
        return 0.0
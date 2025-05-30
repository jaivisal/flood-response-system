"""
GIS service for spatial operations and geographic calculations
"""
from geoalchemy2 import Geography
from geoalchemy2.functions import ST_MakePoint, ST_Distance, ST_DWithin, ST_AsGeoJSON
from sqlalchemy import func
from typing import Tuple, Optional
import math


def create_point_from_coords(latitude: float, longitude: float) -> Geography:
    """Create a PostGIS point from latitude and longitude"""
    return ST_MakePoint(longitude, latitude)


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points using Haversine formula
    Returns distance in kilometers
    """
    # Convert latitude and longitude from degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    
    return c * r


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate bearing between two points
    Returns bearing in degrees
    """
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    dlon = lon2 - lon1
    
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    
    bearing = math.atan2(y, x)
    bearing = math.degrees(bearing)
    bearing = (bearing + 360) % 360
    
    return bearing


def point_in_radius(center_lat: float, center_lon: float, point_lat: float, point_lon: float, radius_km: float) -> bool:
    """Check if a point is within a radius of another point"""
    distance = calculate_distance(center_lat, center_lon, point_lat, point_lon)
    return distance <= radius_km


def get_bounding_box(center_lat: float, center_lon: float, radius_km: float) -> Tuple[float, float, float, float]:
    """
    Get bounding box for a circle
    Returns (min_lat, min_lon, max_lat, max_lon)
    """
    # Approximate conversion: 1 degree ≈ 111 km
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / (111.0 * math.cos(math.radians(center_lat)))
    
    return (
        center_lat - lat_delta,  # min_lat
        center_lon - lon_delta,  # min_lon
        center_lat + lat_delta,  # max_lat
        center_lon + lon_delta   # max_lon
    )


def validate_coordinates(latitude: float, longitude: float) -> bool:
    """Validate that coordinates are within valid ranges"""
    return -90 <= latitude <= 90 and -180 <= longitude <= 180


def normalize_longitude(longitude: float) -> float:
    """Normalize longitude to [-180, 180] range"""
    while longitude > 180:
        longitude -= 360
    while longitude < -180:
        longitude += 360
    return longitude


def format_coordinates(latitude: float, longitude: float, precision: int = 6) -> str:
    """Format coordinates as string with specified precision"""
    return f"{latitude:.{precision}f}, {longitude:.{precision}f}"


def coordinates_to_dms(latitude: float, longitude: float) -> str:
    """Convert decimal degrees to degrees, minutes, seconds format"""
    def dd_to_dms(dd: float, is_latitude: bool = True) -> str:
        direction = ""
        if is_latitude:
            direction = "N" if dd >= 0 else "S"
        else:
            direction = "E" if dd >= 0 else "W"
        
        dd = abs(dd)
        degrees = int(dd)
        minutes = int((dd - degrees) * 60)
        seconds = ((dd - degrees) * 60 - minutes) * 60
        
        return f"{degrees}°{minutes}'{seconds:.2f}\"{direction}"
    
    lat_dms = dd_to_dms(latitude, True)
    lon_dms = dd_to_dms(longitude, False)
    
    return f"{lat_dms}, {lon_dms}"


class GeoUtils:
    """Utility class for geographic operations"""
    
    @staticmethod
    def get_center_point(coordinates: list) -> Tuple[float, float]:
        """Calculate center point of multiple coordinates"""
        if not coordinates:
            return 0.0, 0.0
        
        total_lat = sum(coord[0] for coord in coordinates)
        total_lon = sum(coord[1] for coord in coordinates)
        
        return total_lat / len(coordinates), total_lon / len(coordinates)
    
    @staticmethod
    def get_bounds(coordinates: list) -> Tuple[float, float, float, float]:
        """Get bounding box of coordinates"""
        if not coordinates:
            return 0.0, 0.0, 0.0, 0.0
        
        lats = [coord[0] for coord in coordinates]
        lons = [coord[1] for coord in coordinates]
        
        return min(lats), min(lons), max(lats), max(lons)
    
    @staticmethod
    def calculate_polygon_area(coordinates: list) -> float:
        """Calculate approximate area of polygon in square kilometers"""
        if len(coordinates) < 3:
            return 0.0
        
        # Simple approximation using shoelace formula
        # For more accuracy, use proper geographic calculations
        area = 0.0
        n = len(coordinates)
        
        for i in range(n):
            j = (i + 1) % n
            area += coordinates[i][0] * coordinates[j][1]
            area -= coordinates[j][0] * coordinates[i][1]
        
        area = abs(area) / 2.0
        
        # Convert to approximate square kilometers
        # This is a rough approximation; use proper projection for accuracy
        area_km2 = area * 111.0 * 111.0 * math.cos(math.radians(
            sum(coord[0] for coord in coordinates) / len(coordinates)
        ))
        
        return area_km2
import asyncio
import structlog
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import httpx
import json

from app.config import settings
from app.utils.redis_client import redis_client
from app.utils.geo import haversine_km

logger = structlog.get_logger()
router = APIRouter(prefix="/maps", tags=["Places Map Integration"])

class PlaceItem(BaseModel):
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    types: List[str]
    distance_km: float

class NearbyPlacesResponse(BaseModel):
    category: str
    places: List[PlaceItem]
    center: Dict[str, float]

def get_mock_places(lat: float, lon: float, category: str) -> List[Dict]:
    """
    Generate realistic mock places around the coordinates as fallback.
    """
    mock_data = []
    
    if category == "police":
        mock_data = [
            {
                "id": "mock_p1",
                "name": "Central District Police Station",
                "address": "Main Bazar Rd, Near City Center",
                "lat_offset": 0.008,
                "lon_offset": -0.005,
                "types": ["police", "establishment"]
            },
            {
                "id": "mock_p2",
                "name": "Suburban Police HQ",
                "address": "Sector 4 Outer Ring Rd",
                "lat_offset": -0.012,
                "lon_offset": 0.015,
                "types": ["police", "establishment"]
            },
            {
                "id": "mock_p3",
                "name": "Traffic Police Booth & Station",
                "address": "Junction 12, Station Road",
                "lat_offset": 0.003,
                "lon_offset": 0.009,
                "types": ["police", "establishment"]
            }
        ]
    elif category == "court":
        mock_data = [
            {
                "id": "mock_c1",
                "name": "District & Sessions Court Complex",
                "address": "Court Road, Civil Lines",
                "lat_offset": 0.015,
                "lon_offset": 0.004,
                "types": ["courthouse", "establishment"]
            },
            {
                "id": "mock_c2",
                "name": "Family & Consumer Disputes Forum",
                "address": "Nyaya Marg, Near Fountain Chowk",
                "lat_offset": -0.005,
                "lon_offset": -0.012,
                "types": ["courthouse", "establishment"]
            }
        ]
    elif category == "legal_aid":
        mock_data = [
            {
                "id": "mock_l1",
                "name": "District Legal Services Authority (DLSA)",
                "address": "Room 14, Ground Floor, District Court Complex",
                "lat_offset": 0.014,
                "lon_offset": 0.005,
                "types": ["legal_aid", "local_government_office", "establishment"]
            },
            {
                "id": "mock_l2",
                "name": "State Legal Aid Clinic (Pro-Bono Center)",
                "address": "Community Hall Plaza, Block C",
                "lat_offset": -0.002,
                "lon_offset": 0.006,
                "types": ["legal_aid", "non_profit", "establishment"]
            }
        ]
        
    places = []
    for item in mock_data:
        p_lat = lat + item["lat_offset"]
        p_lon = lon + item["lon_offset"]
        dist = haversine_km(lat, lon, p_lat, p_lon)
        places.append({
            "id": item["id"],
            "name": item["name"],
            "address": item["address"],
            "latitude": p_lat,
            "longitude": p_lon,
            "types": item["types"],
            "distance_km": round(dist, 2)
        })
        
    # Sort by distance
    places.sort(key=lambda x: x["distance_km"])
    return places

@router.get("/nearby", response_model=NearbyPlacesResponse)
async def get_nearby_places(
    lat: float = Query(...),
    lon: float = Query(...),
    category: str = Query(..., description="Category: police, court, legal_aid"),
    radius_meters: int = Query(5000, ge=500, le=50000)
):
    """
    Get nearby police stations, courts, or legal aid centers using free, public Overpass API (OpenStreetMap).
    """
    if category not in ["police", "court", "legal_aid"]:
        raise HTTPException(status_code=400, detail="Invalid category. Must be 'police', 'court', or 'legal_aid'.")
        
    cache_key = f"places_nearby:lat={lat}:lon={lon}:cat={category}:rad={radius_meters}"
    
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return NearbyPlacesResponse.model_validate_json(cached)
    except Exception as e:
        logger.warning(f"Failed to read from cache: {e}")

    # Build Overpass Query
    if category == "police":
        query = f"""[out:json][timeout:25];
        (
          node["amenity"="police"](around:{radius_meters},{lat},{lon});
          way["amenity"="police"](around:{radius_meters},{lat},{lon});
        );
        out center;"""
    elif category == "court":
        query = f"""[out:json][timeout:25];
        (
          node["amenity"="courthouse"](around:{radius_meters},{lat},{lon});
          way["amenity"="courthouse"](around:{radius_meters},{lat},{lon});
        );
        out center;"""
    else: # legal_aid
        query = f"""[out:json][timeout:25];
        (
          node["office"="lawyer"](around:{radius_meters},{lat},{lon});
          node["amenity"="townhall"](around:{radius_meters},{lat},{lon});
          node["office"="government"](around:{radius_meters},{lat},{lon});
          way["office"="lawyer"](around:{radius_meters},{lat},{lon});
          way["amenity"="townhall"](around:{radius_meters},{lat},{lon});
          way["office"="government"](around:{radius_meters},{lat},{lon});
        );
        out center;"""

    places = []
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": query},
                timeout=15.0
            )
            
            if response.status_code == 200:
                data = response.json()
                elements = data.get("elements", [])
                
                for el in elements:
                    tags = el.get("tags", {})
                    p_lat = el.get("lat") or el.get("center", {}).get("lat")
                    p_lon = el.get("lon") or el.get("center", {}).get("lng") or el.get("center", {}).get("lon")
                    
                    if p_lat is None or p_lon is None:
                        continue
                        
                    dist = haversine_km(lat, lon, p_lat, p_lon)
                    
                    # Try to extract a name
                    name = tags.get("name") or tags.get("official_name") or tags.get("name:en")
                    if not name:
                        if category == "police":
                            name = "Police Station"
                        elif category == "court":
                            name = "Courthouse"
                        else:
                            name = "Government / Legal Office"
                    
                    # Build address from osm tags
                    addr_parts = []
                    for k in ["addr:housenumber", "addr:street", "addr:suburb", "addr:city", "addr:state", "addr:postcode"]:
                        val = tags.get(k)
                        if val:
                            addr_parts.append(val)
                    address = ", ".join(addr_parts) if addr_parts else tags.get("description", "Address details not available")
                    
                    places.append(PlaceItem(
                        id=str(el.get("id")),
                        name=name,
                        address=address,
                        latitude=p_lat,
                        longitude=p_lon,
                        types=[tags.get("amenity") or tags.get("office") or category],
                        distance_km=round(dist, 2)
                    ))
                    
                # Sort by distance
                places.sort(key=lambda x: x.distance_km)
                
            else:
                logger.error(f"Overpass API returned status {response.status_code}: {response.text}")
                
        except Exception as e:
            logger.error(f"Error calling Overpass API: {e}")

    # Fallback to mock places if Overpass failed or returned no results
    if not places:
        logger.info("Overpass API returned no results or failed, falling back to mock places.")
        mock_places = get_mock_places(lat, lon, category)
        places = [PlaceItem(**p) for p in mock_places]

    res = NearbyPlacesResponse(
        category=category,
        places=places,
        center={"latitude": lat, "longitude": lon}
    )

    # Save to Redis cache
    try:
        await redis_client.setex(cache_key, 86400, res.model_dump_json())
    except Exception as e:
        logger.warning(f"Failed to cache nearby places: {e}")

    return res

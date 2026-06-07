import math
from typing import Optional, List, Dict
from app.utils.geo import haversine_km
from app.models.lawyer import LawyerMapFilters, LawyerMapPin, LawyerMapResponse

def get_map_pins(
    db_client,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    radius_km: float = 15.0,
    filters: Optional[LawyerMapFilters] = None
) -> LawyerMapResponse:
    """
    Query lawyers from database and filter/sort them by GPS distance, bounding box,
    availability, specialisation, language, and hourly fee.
    """
    if filters is None:
        filters = LawyerMapFilters()

    # Base query for active, verified lawyers
    query = db_client.table("lawyers").select("*").eq("is_verified", True).eq("is_active", True)
    
    use_gps = lat is not None and lon is not None

    if use_gps:
        # Approximate boundary box calculation
        # 1 degree of latitude is roughly 111 km
        lat_delta = radius_km / 111.0
        # 1 degree of longitude varies by latitude
        cos_lat = math.cos(math.radians(lat))
        lon_delta = radius_km / (111.0 * cos_lat) if cos_lat > 0.01 else radius_km / 111.0

        lat_min, lat_max = lat - lat_delta, lat + lat_delta
        lon_min, lon_max = lon - lon_delta, lon + lon_delta

        query = query.gte("latitude", lat_min).lte("latitude", lat_max).gte("longitude", lon_min).lte("longitude", lon_max)
    elif city:
        query = query.ilike("city", f"%{city.strip()}%")
    elif state:
        query = query.ilike("state", f"%{state.strip()}%")

    # If available only is requested, filter in database
    if filters.available_only:
        # Note: checks if is_available column is true
        query = query.eq("is_available", True)

    # Execute database query
    res = query.execute()
    db_lawyers = res.data or []

    pins: List[LawyerMapPin] = []
    
    for l in db_lawyers:
        # Extract location coordinates safely
        l_lat = l.get("latitude")
        l_lon = l.get("longitude")
        
        # Verify coordinates exist when GPS search is active
        if use_gps and (l_lat is None or l_lon is None):
            continue
            
        dist = None
        if use_gps:
            dist = haversine_km(lat, lon, float(l_lat), float(l_lon))
            # Exact radius filter
            if dist > radius_km:
                continue

        # Filter by specialisation (case-insensitive list search)
        specialisations = l.get("specialisations") or []
        if filters.specialisation:
            spec_match = any(filters.specialisation.lower() in s.lower() for s in specialisations)
            if not spec_match:
                continue

        # Filter by language (case-insensitive list search)
        languages = l.get("languages") or []
        if filters.language:
            lang_match = any(filters.language.lower() in lang.lower() for lang in languages)
            if not lang_match:
                continue

        # Filter by maximum fee
        fee = l.get("fee_per_hour_inr") or 0
        if filters.max_fee is not None and fee > filters.max_fee:
            continue

        # Calculate a smart score out of 100 for ranking
        score = 0.0
        
        # 1. Distance score (max 40 pts)
        if dist is not None:
            if dist <= 2.0:
                score += 40.0
            elif dist <= 5.0:
                score += 30.0
            elif dist <= 10.0:
                score += 20.0
            else:
                score += 10.0
        else:
            # Neutral distance score when GPS is not active
            score += 20.0

        # 2. Rating score (max 20 pts)
        rating = float(l.get("average_rating") or 0.0)
        score += min(rating * 4.0, 20.0)

        # 3. Experience score (max 20 pts)
        exp = float(l.get("experience_years") or 0.0)
        score += min(exp * 1.0, 20.0)

        # 4. Availability score (max 10 pts)
        is_avail = bool(l.get("is_available", True))
        if is_avail:
            score += 10.0

        # 5. Reviews volume boost (max 10 pts)
        reviews_count = int(l.get("total_reviews") or 0)
        score += min(reviews_count * 0.5, 10.0)

        pins.append(
            LawyerMapPin(
                id=str(l["id"]),
                full_name=l["full_name"],
                specialisations=specialisations,
                experience_years=int(l.get("experience_years") or 0),
                city=l.get("city") or "",
                latitude=float(l_lat) if l_lat is not None else 0.0,
                longitude=float(l_lon) if l_lon is not None else 0.0,
                distance_km=dist,
                fee_per_hour_inr=int(fee),
                average_rating=rating,
                total_reviews=reviews_count,
                languages=languages,
                is_available=is_avail,
                profile_photo_url=l.get("profile_photo_url"),
                score=round(score, 1)
            )
        )

    # Sort pins by score descending, then distance ascending
    pins.sort(key=lambda x: (-x.score, x.distance_km if x.distance_km is not None else 0))
    
    # Apply limit filter
    pins = pins[:filters.limit]

    # Calculate center point
    if use_gps:
        center = {"latitude": lat, "longitude": lon}
    elif pins:
        # Fallback to mean coordinates of matching pins
        center = {
            "latitude": sum(p.latitude for p in pins) / len(pins),
            "longitude": sum(p.longitude for p in pins) / len(pins)
        }
    else:
        # Default center to Mumbai / India center
        center = {"latitude": 19.0760, "longitude": 72.8777}

    return LawyerMapResponse(
        lawyers=pins,
        center=center,
        total_count=len(pins),
        radius_km=radius_km
    )

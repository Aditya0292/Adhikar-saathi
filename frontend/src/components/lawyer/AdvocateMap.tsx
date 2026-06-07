import { useState, useEffect, useRef } from 'react';
import { Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { lawyerApi, LawyerMapPin, PlaceItem } from '../../api/lawyer';
import { Navigation, Scale, Shield, Building2, HeartHandshake, Locate } from 'lucide-react';

// Premium Warm Light Map Style matching bg-nyaya-warm and forest green accents
const WARM_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f7f5f0' }] }, // matches bg-nyaya-warm
  { elementType: 'labels.text.fill', stylers: [{ color: '#1b4332' }] }, // matches nyaya-green
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f7f5f0' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e0dbce' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a9e8d' }], // matches nyaya-muted
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#1b4332' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#2d6a4f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#d2e5db' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#1b4332' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e8e5db' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a9e8d' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#fbfaf8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e8e5db' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#d2e5db' }], // light warm green-blue
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#1b4332' }],
  },
];

interface AdvocateMapProps {
  initialLat?: number;
  initialLon?: number;
  mode?: 'advocate' | 'emergency';
  onAdvocateSelect?: (lawyer: LawyerMapPin) => void;
  selectedLawyerId?: string;
  className?: string;
  showFilters?: boolean;
  onLawyersUpdate?: (lawyers: LawyerMapPin[]) => void;
  lawyers?: LawyerMapPin[];
}

export default function AdvocateMap({
  initialLat,
  initialLon,
  mode = 'advocate',
  onAdvocateSelect,
  selectedLawyerId,
  className = '',
  showFilters = true,
  onLawyersUpdate,
  lawyers: lawyersProp,
}: AdvocateMapProps) {
  const map = useMap();
  const [center, setCenter] = useState({ lat: initialLat || 19.0760, lng: initialLon || 72.8777 });
  const [zoom, setZoom] = useState(13);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Data lists
  const [lawyers, setLawyers] = useState<LawyerMapPin[]>([]);
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [selectedPin, setSelectedPin] = useState<LawyerMapPin | PlaceItem | null>(null);
  const [selectedPlaceType, setSelectedPlaceType] = useState<'police' | 'court' | 'legal_aid'>('police');
  
  // Filters
  const [specialisation, setSpecialisation] = useState('');
  const [language, setLanguage] = useState('');
  const [maxFee, setMaxFee] = useState<number | ''>('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [radius, setRadius] = useState(15);
  
  // Loading & searching
  const [loading, setLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [searchAreaActive, setSearchAreaActive] = useState(false);

  // Track map bounds center
  const lastMapCenter = useRef({ lat: center.lat, lng: center.lng });

  // Get user geolocation
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        setUserLocation(coords);
        setCenter(coords);
        setZoom(14);
        setGpsError('');
        setLoading(false);
      },
      (error) => {
        console.error('GPS Geolocation error:', error);
        setGpsError('GPS permission denied. Using default location (Mumbai).');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Fetch lawyers or nearby places when center or filters change
  const fetchMapData = async (latVal = center.lat, lngVal = center.lng) => {
    if (lawyersProp) {
      if (mode === 'emergency') {
        setLoading(true);
        try {
          const res = await lawyerApi.getNearbyPlaces(latVal, lngVal, selectedPlaceType, radius * 1000);
          setPlaces(res.places);
        } catch (err) {
          console.error('Error fetching emergency places:', err);
        } finally {
          setLoading(false);
        }
      }
      return;
    }
    setLoading(true);
    try {
      if (mode === 'advocate') {
        const res = await lawyerApi.getMapPins({
          lat: latVal,
          lon: lngVal,
          radius_km: radius,
          specialisation: specialisation || undefined,
          language: language || undefined,
          max_fee: maxFee === '' ? undefined : Number(maxFee),
          available_only: availableOnly,
        });
        setLawyers(res.lawyers);
        onLawyersUpdate?.(res.lawyers);
        if (res.lawyers.length > 0 && selectedLawyerId) {
          const selected = res.lawyers.find(l => l.id === selectedLawyerId);
          if (selected) {
            setSelectedPin(selected);
          }
        }
      } else {
        // Emergency mode: fetch selected place type
        const res = await lawyerApi.getNearbyPlaces(latVal, lngVal, selectedPlaceType, radius * 1000);
        setPlaces(res.places);
        
        // Also fetch closest advocates for criminal/emergency backup
        const advRes = await lawyerApi.getMapPins({
          lat: latVal,
          lon: lngVal,
          radius_km: radius,
          specialisation: 'criminal',
          available_only: true,
          limit: 10
        });
        setLawyers(advRes.lawyers);
        onLawyersUpdate?.(advRes.lawyers);
      }
    } catch (err) {
      console.error('Error fetching map pins:', err);
    } finally {
      setLoading(false);
      setSearchAreaActive(false);
    }
  };

  // Initial Detect Location & Load
  useEffect(() => {
    detectLocation();
  }, []);

  // Synchronize lawyers list if passed as a prop
  useEffect(() => {
    if (lawyersProp) {
      setLawyers(lawyersProp);
    }
  }, [lawyersProp]);

  // Fetch data on center/radius/filters/mode change
  useEffect(() => {
    fetchMapData(center.lat, center.lng);
  }, [center.lat, center.lng, radius, specialisation, language, maxFee, availableOnly, selectedPlaceType, mode]);

  // Center map on selected lawyer from props
  useEffect(() => {
    if (selectedLawyerId && lawyers.length > 0) {
      const selected = lawyers.find(l => l.id === selectedLawyerId);
      if (selected) {
        setSelectedPin(selected);
        setCenter({ lat: selected.latitude, lng: selected.longitude });
        setZoom(15);
      }
    }
  }, [selectedLawyerId, lawyers]);

  // Handle map movement
  const handleBoundsChange = () => {
    if (!map) return;
    const currentCenter = map.getCenter();
    if (!currentCenter) return;
    
    const lat = currentCenter.lat();
    const lng = currentCenter.lng();
    
    // Check if map moved significantly
    const moved = Math.abs(lat - lastMapCenter.current.lat) > 0.005 || 
                  Math.abs(lng - lastMapCenter.current.lng) > 0.005;
                  
    if (moved) {
      setSearchAreaActive(true);
      lastMapCenter.current = { lat, lng };
    }
  };

  const handleSearchThisArea = () => {
    setCenter({ lat: lastMapCenter.current.lat, lng: lastMapCenter.current.lng });
  };

  // Directions linker helper
  const getDirectionsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  return (
    <div className={`flex flex-col h-full bg-white border border-black/8 rounded-2xl overflow-hidden shadow-sm ${className}`}>
      
      {/* Search and Filters Block */}
      {showFilters && mode === 'advocate' && (
        <div className="p-4 bg-nyaya-warm/50 border-b border-black/5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-nyaya-muted mb-1 uppercase tracking-wider">Specialisation</label>
            <select
              value={specialisation}
              onChange={(e) => setSpecialisation(e.target.value)}
              className="w-full bg-white border border-black/10 text-nyaya-text-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nyaya-green focus:ring-nyaya-green/20"
            >
              <option value="">All Specialities</option>
              <option value="criminal">Criminal Defense</option>
              <option value="civil">Civil Litigation</option>
              <option value="consumer">Consumer Forum</option>
              <option value="labour">Labour & Service</option>
              <option value="women">Women's Rights</option>
              <option value="property">Property Law</option>
              <option value="family">Family Law</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-nyaya-muted mb-1 uppercase tracking-wider">Max Fee (INR/hr)</label>
            <input
              type="number"
              placeholder="e.g. 5000"
              value={maxFee}
              onChange={(e) => setMaxFee(e.target.value !== '' ? Number(e.target.value) : '')}
              className="w-full bg-white border border-black/10 text-nyaya-text-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nyaya-green focus:ring-nyaya-green/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-nyaya-muted mb-1 uppercase tracking-wider">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-white border border-black/10 text-nyaya-text-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nyaya-green focus:ring-nyaya-green/20"
            >
              <option value="">All Languages</option>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="marathi">Marathi</option>
              <option value="tamil">Tamil</option>
              <option value="bengali">Bengali</option>
              <option value="gujarati">Gujarati</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-nyaya-muted mb-1 uppercase tracking-wider">Search Radius ({radius} km)</label>
            <input
              type="range"
              min="2"
              max="50"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-nyaya-green"
            />
          </div>
          <div className="flex items-center space-x-2 py-1 justify-between">
            <label className="flex items-center space-x-2 text-sm text-nyaya-text-dark cursor-pointer">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="w-4 h-4 rounded text-nyaya-green focus:ring-nyaya-green bg-white border-black/10"
              />
              <span>Available Now</span>
            </label>
            <button
              onClick={detectLocation}
              disabled={loading}
              className="bg-nyaya-green hover:bg-nyaya-green-mid disabled:opacity-50 text-white p-2.5 rounded-lg transition flex items-center justify-center min-h-[38px] min-w-[38px]"
              title="Find my location"
            >
              <Locate size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Emergency Mode Tabs */}
      {mode === 'emergency' && (
        <div className="p-4 bg-red-50 border-b border-red-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedPlaceType('police')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                selectedPlaceType === 'police'
                  ? 'bg-red-650 text-white shadow-md shadow-red-200'
                  : 'bg-white border border-black/10 text-slate-650 hover:bg-slate-50'
              }`}
            >
              <Shield size={14} /> Police Stations
            </button>
            <button
              onClick={() => setSelectedPlaceType('court')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                selectedPlaceType === 'court'
                  ? 'bg-blue-650 text-white shadow-md shadow-blue-200'
                  : 'bg-white border border-black/10 text-slate-650 hover:bg-slate-50'
              }`}
            >
              <Building2 size={14} /> Courts
            </button>
            <button
              onClick={() => setSelectedPlaceType('legal_aid')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                selectedPlaceType === 'legal_aid'
                  ? 'bg-amber-650 text-white shadow-md shadow-amber-200'
                  : 'bg-white border border-black/10 text-slate-650 hover:bg-slate-50'
              }`}
            >
              <HeartHandshake size={14} /> Legal Aid
            </button>
          </div>
          <div className="flex items-center space-x-3 text-xs text-nyaya-muted">
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-full bg-nyaya-green block"></span>
              <span>Defense Lawyers</span>
            </div>
            <button
              onClick={detectLocation}
              className="bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1 transition shadow-sm cursor-pointer"
            >
              <Locate size={12} />
              <span>GPS Center</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Map Container */}
      <div className="relative flex-grow h-full min-h-[300px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 border-4 border-nyaya-green border-t-transparent rounded-full animate-spin"></div>
              <p className="text-nyaya-text-dark font-semibold text-sm">Locating coordinates & matches...</p>
            </div>
          </div>
        )}

        {gpsError && (
          <div className="absolute top-4 left-4 right-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-lg text-xs z-10 flex justify-between items-center">
            <span>⚠️ {gpsError}</span>
            <button onClick={() => setGpsError('')} className="text-amber-600 hover:text-amber-800 font-bold ml-2">×</button>
          </div>
        )}

        {/* Floating "Search this area" button */}
        {searchAreaActive && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <button
              onClick={handleSearchThisArea}
              className="bg-white/95 border border-black/10 hover:bg-nyaya-warm text-nyaya-text-dark text-xs font-semibold px-4 py-2 rounded-full shadow-md flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
            >
              🔍 <span>Search in this area</span>
            </button>
          </div>
        )}

        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          center={center}
          zoom={zoom}
          mapId="DEMO_MAP_ID"
          styles={WARM_MAP_STYLE}
          onCenterChanged={handleBoundsChange}
          disableDefaultUI={false}
          className="w-full h-full"
        >
          {/* User Current Position Pulsing Pin */}
          {userLocation && (
            <AdvancedMarker position={userLocation}>
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-6 w-6 rounded-full bg-sky-400 opacity-60 animate-ping"></span>
                <span className="relative rounded-full h-4 w-4 bg-sky-500 border-2 border-white shadow-md shadow-sky-900/40"></span>
              </div>
            </AdvancedMarker>
          )}

          {/* Plot Advocates */}
          {lawyers.map((lawyer) => {
            const isSelected = selectedPin && 'full_name' in selectedPin && selectedPin.id === lawyer.id;
            return (
              <AdvancedMarker
                key={`lawyer-${lawyer.id}`}
                position={{ lat: lawyer.latitude, lng: lawyer.longitude }}
                onClick={() => setSelectedPin(lawyer)}
              >
                <div className={`cursor-pointer transform transition duration-200 hover:scale-115 ${
                  isSelected ? 'scale-120 z-20' : 'scale-100'
                }`}>
                  <div className={`p-1 rounded-full border-2 shadow-md flex items-center justify-center ${
                    isSelected 
                      ? 'bg-nyaya-green border-white shadow-nyaya-green/45' 
                      : lawyer.is_available 
                        ? 'bg-nyaya-green border-nyaya-green-bright' 
                        : 'bg-slate-400 border-slate-200'
                  }`}>
                    {lawyer.profile_photo_url ? (
                      <img 
                        src={lawyer.profile_photo_url} 
                        alt={lawyer.full_name} 
                        className="w-8 h-8 rounded-full object-cover" 
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center">
                        <Scale size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Plot Nearby Places (Emergency Mode) */}
          {mode === 'emergency' && places.map((place) => {
            const isSelected = selectedPin && 'address' in selectedPin && selectedPin.id === place.id;
            const glyphIcon = selectedPlaceType === 'police' 
              ? <Shield size={12} className="text-white" /> 
              : selectedPlaceType === 'court' 
                ? <Building2 size={12} className="text-white" /> 
                : <HeartHandshake size={12} className="text-white" />;
            const color = selectedPlaceType === 'police' ? '#dc2626' : selectedPlaceType === 'court' ? '#2563eb' : '#d97706';
            
            return (
              <AdvancedMarker
                key={`place-${place.id}`}
                position={{ lat: place.latitude, lng: place.longitude }}
                onClick={() => setSelectedPin(place)}
              >
                <div className={`cursor-pointer flex flex-col items-center transform transition duration-200 hover:scale-115 ${
                  isSelected ? 'scale-125 z-20' : 'scale-100'
                }`}>
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-md"
                    style={{ backgroundColor: color }}
                  >
                    {glyphIcon}
                  </div>
                  <div 
                    className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent -mt-[1px] relative z-10"
                    style={{ borderTopColor: color }}
                  />
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Map Info Window for Selected Pin */}
          {selectedPin && (
            <InfoWindow
              position={{ lat: selectedPin.latitude, lng: selectedPin.longitude }}
              onCloseClick={() => setSelectedPin(null)}
              headerDisabled
            >
              <div className="p-2 text-slate-900 max-w-[260px] leading-snug">
                {'full_name' in selectedPin ? (
                  /* Lawyer Pin Details */
                  <div>
                    <div className="flex items-center space-x-2 mb-1.5">
                      {selectedPin.profile_photo_url ? (
                        <img 
                          src={selectedPin.profile_photo_url} 
                          alt={selectedPin.full_name} 
                          className="w-8 h-8 rounded-full object-cover border border-violet-250" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-nyaya-green/10 flex items-center justify-center text-nyaya-green">
                          <Scale size={16} />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{selectedPin.full_name}</h4>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase">
                          {selectedPin.specialisations[0]}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs border-t border-slate-100 pt-1.5 mb-2.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Exp:</span>
                        <span className="font-semibold">{selectedPin.experience_years} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fee:</span>
                        <span className="font-semibold text-emerald-700">₹{selectedPin.fee_per_hour_inr}/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rating:</span>
                        <span className="font-semibold text-amber-500">★ {selectedPin.average_rating.toFixed(1)} ({selectedPin.total_reviews})</span>
                      </div>
                      {selectedPin.distance_km !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Distance:</span>
                          <span className="font-semibold text-nyaya-green-mid">{selectedPin.distance_km.toFixed(1)} km</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Status:</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                          selectedPin.is_available 
                            ? 'bg-emerald-50 text-emerald-800' 
                            : 'bg-slate-100 text-slate-650'
                        }`}>
                          {selectedPin.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onAdvocateSelect?.(selectedPin as LawyerMapPin)}
                        className="bg-nyaya-green hover:bg-nyaya-green-mid text-white font-bold py-1.5 px-2 rounded text-center text-[10px] transition cursor-pointer"
                      >
                        Profile & Connect
                      </button>
                      <a
                        href={getDirectionsUrl(selectedPin.latitude, selectedPin.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white hover:bg-nyaya-warm text-nyaya-text-dark font-bold py-1.5 px-2 rounded text-center text-[10px] border border-black/10 block transition"
                      >
                        Get Directions
                      </a>
                    </div>
                  </div>
                ) : (
                  /* Place Pin Details */
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-0.5">{selectedPin.name}</h4>
                    <p className="text-[10px] text-slate-500 mb-1.5 font-medium">{selectedPin.address}</p>
                    
                    <div className="space-y-1 text-xs border-t border-slate-100 pt-1.5 mb-2.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Distance:</span>
                        <span className="font-semibold text-slate-900">{selectedPin.distance_km.toFixed(1)} km</span>
                      </div>
                    </div>

                    <a
                      href={getDirectionsUrl(selectedPin.latitude, selectedPin.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-nyaya-green hover:bg-nyaya-green-mid text-white font-bold py-1.5 px-2 rounded text-center text-[10px] flex items-center justify-center gap-1.5 transition"
                    >
                      <Navigation size={10} /> Show Directions
                    </a>
                  </div>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>
    </div>
  );
}

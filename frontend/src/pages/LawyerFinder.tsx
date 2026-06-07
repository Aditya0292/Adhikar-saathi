import { useState, useEffect, FormEvent } from 'react';
import { AppShell } from '../components/layout/AppShell';
import LawyerCard from '../components/lawyer/LawyerCard';
import AdvocateMap from '../components/lawyer/AdvocateMap';
import { lawyerApi, LawyerMapPin } from '../api/lawyer';
import { Scale, Search, SlidersHorizontal, Map } from 'lucide-react';

const SPECIALISATIONS = ['criminal', 'civil', 'family', 'labour', 'consumer', 'property', 'corporate'];

// Fallback verified advocates representing the base directory
const mockLawyers: LawyerMapPin[] = [
  {
    id: 'mock-1',
    full_name: 'Anjali Sharma',
    specialisations: ['criminal', 'family'],
    city: 'Mumbai',
    experience_years: 12,
    fee_per_hour_inr: 1500,
    average_rating: 4.8,
    total_reviews: 24,
    languages: ['English', 'Hindi', 'Marathi'],
    latitude: 19.0760,
    longitude: 72.8777,
    is_available: true,
    score: 95.0,
    profile_photo_url: undefined
  },
  {
    id: 'mock-2',
    full_name: 'Rajesh Kumar',
    specialisations: ['property', 'civil'],
    city: 'Delhi',
    experience_years: 8,
    fee_per_hour_inr: 1000,
    average_rating: 4.5,
    total_reviews: 12,
    languages: ['English', 'Hindi'],
    latitude: 28.6139,
    longitude: 77.2090,
    is_available: true,
    score: 85.0,
    profile_photo_url: undefined
  },
  {
    id: 'mock-3',
    full_name: 'Priya Patel',
    specialisations: ['corporate', 'property'],
    city: 'Ahmedabad',
    experience_years: 15,
    fee_per_hour_inr: 2500,
    average_rating: 4.9,
    total_reviews: 42,
    languages: ['English', 'Gujarati', 'Hindi'],
    latitude: 23.0225,
    longitude: 72.5714,
    is_available: false,
    score: 90.0,
    profile_photo_url: undefined
  },
  {
    id: 'mock-4',
    full_name: 'Vikram Singh',
    specialisations: ['constitutional', 'criminal'],
    city: 'Lucknow',
    experience_years: 20,
    fee_per_hour_inr: 3000,
    average_rating: 4.7,
    total_reviews: 31,
    languages: ['English', 'Hindi'],
    latitude: 26.8467,
    longitude: 80.9462,
    is_available: true,
    score: 92.0,
    profile_photo_url: undefined
  }
];

export default function LawyerFinder() {
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 19.0760, lng: 72.8777 });
  const [searchCity, setSearchCity] = useState('');
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  
  // API loaded lawyers
  const [dbLawyers, setDbLawyers] = useState<LawyerMapPin[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  
  // Selected state
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | undefined>(undefined);
  const [mapOpen, setMapOpen] = useState(true);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialisation, setSelectedSpecialisation] = useState('');
  const [maxFee, setMaxFee] = useState<number | ''>('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [offersFreeConsultation, setOffersFreeConsultation] = useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Load verified database lawyers on mount
  const fetchDbLawyers = async () => {
    setLoadingDb(true);
    try {
      // Query without bounding box to fetch all active, verified lawyers
      const res = await lawyerApi.getMapPins({ limit: 100 });
      setDbLawyers(res.lawyers);
    } catch (e) {
      console.error('Failed to load database lawyers:', e);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbLawyers();
  }, []);

  // Merge database and mock lawyers list
  const allLawyers = [
    ...dbLawyers,
    ...mockLawyers.filter(
      ml => !dbLawyers.some(dl => dl.id === ml.id || dl.full_name.toLowerCase() === ml.full_name.toLowerCase())
    )
  ];

  // Apply filters on the merged list
  const filteredLawyers = allLawyers.filter((lawyer) => {
    // 1. Text Search (name, city, specialisation)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const nameMatch = lawyer.full_name.toLowerCase().includes(term);
      const cityMatch = lawyer.city.toLowerCase().includes(term);
      const specMatch = lawyer.specialisations.some(s => s.toLowerCase().includes(term));
      if (!nameMatch && !cityMatch && !specMatch) return false;
    }

    // 2. Specialisation tag filter
    if (selectedSpecialisation) {
      const hasSpec = lawyer.specialisations.some(
        s => s.toLowerCase() === selectedSpecialisation.toLowerCase()
      );
      if (!hasSpec) return false;
    }

    // 3. Max Fee filter
    if (maxFee !== '') {
      if (lawyer.fee_per_hour_inr > Number(maxFee)) return false;
    }

    // 4. Free Consultation filter
    if (offersFreeConsultation) {
      if (lawyer.fee_per_hour_inr !== 0) return false;
    }

    // 5. Available Only filter
    if (availableOnly && !lawyer.is_available) return false;

    return true;
  });

  // Handle city search (Geocode & Center Map)
  const handleCitySearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchCity.trim()) return;

    setLoadingGeocode(true);
    setGeocodeError('');
    try {
      const coords = await lawyerApi.geocodeAddress(searchCity);
      setCenter({ lat: coords.latitude, lng: coords.longitude });
      setSearchTerm(searchCity); // Filter directory to match the searched city as well
      setGeocodeError('');
      setMapOpen(true);
    } catch (err: any) {
      console.error('Geocoding search failed:', err);
      setGeocodeError('Location not found. Please try another city.');
    } finally {
      setLoadingGeocode(false);
    }
  };

  // Sync selected pin
  const handleAdvocateSelect = (lawyer: LawyerMapPin) => {
    setSelectedLawyerId(lawyer.id);
    const element = document.getElementById(`lawyer-card-${lawyer.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Toggle specialisation filters
  const toggleSpecialisation = (spec: string) => {
    setSelectedSpecialisation(prev => (prev === spec ? '' : spec));
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-black/8 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <Scale className="text-nyaya-green shrink-0" size={28} />
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-nyaya-text-dark">
                Find a Verified Advocate (अधिवक्ता खोजें)
              </h1>
              <p className="text-sm text-nyaya-muted mt-0.5 font-sans">
                Connect with GPS-matched, Bar Council verified advocates near you.
              </p>
            </div>
          </div>
          
          {/* City Locator Form */}
          <form onSubmit={handleCitySearch} className="flex gap-2 w-full md:w-auto max-w-md">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search city (e.g. Delhi, Mumbai)..."
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-nyaya-warm/50 border border-black/10 text-nyaya-text-dark rounded-xl text-sm focus:outline-none focus:border-nyaya-green min-h-[44px]"
              />
              <Search size={16} className="absolute left-3 top-3.5 text-nyaya-muted" />
            </div>
            <button
              type="submit"
              disabled={loadingGeocode || !searchCity.trim()}
              className="bg-nyaya-green hover:bg-nyaya-green-mid disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              {loadingGeocode ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                'Find'
              )}
            </button>
          </form>
        </div>

        {geocodeError && (
          <div className="bg-red-50 border border-red-250 text-red-800 px-4 py-3 rounded-2xl text-sm">
            ⚠️ {geocodeError}
          </div>
        )}

        {/* Mobile Filters Trigger */}
        <div className="md:hidden flex gap-2 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name, city, or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-black/8 text-nyaya-text-dark rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-nyaya-green/20 focus:border-nyaya-green"
            />
            <Search size={16} className="absolute left-3 top-4 text-nyaya-muted" />
          </div>
          <button
            onClick={() => setShowFiltersMobile(true)}
            className="bg-white border border-black/8 p-3 rounded-xl flex items-center justify-center text-nyaya-muted min-h-[46px] min-w-[46px] hover:bg-nyaya-warm transition"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Main Grid: Filters Sidebar (Left) + Results & Map Pane (Right) */}
        <div className="flex flex-col md:flex-row gap-6 w-full items-start">
          
          {/* Desktop Filters / Mobile Bottom Sheet Filters */}
          <div className={`${
            showFiltersMobile 
              ? 'fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs' 
              : 'hidden md:block w-72 shrink-0 bg-white border border-black/8 p-5 rounded-2xl shadow-sm'
          }`}>
            <div className={`${showFiltersMobile ? 'bg-white border-t border-black/10 rounded-t-3xl p-6 w-full max-h-[85vh] overflow-y-auto' : 'sticky top-6'}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-nyaya-text-dark">Filters</h3>
                {showFiltersMobile && (
                  <button 
                    onClick={() => setShowFiltersMobile(false)} 
                    className="p-2 min-h-[44px] min-w-[44px] bg-nyaya-warm hover:bg-black/5 text-nyaya-text-dark rounded-full flex items-center justify-center transition animate-fade-in"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="space-y-6 pb-6 text-sm">
                {/* Specialisation Tags */}
                <div>
                  <label className="font-semibold text-xs text-nyaya-muted block mb-3 uppercase tracking-wider">Specialisation</label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALISATIONS.map(s => {
                      const isActive = selectedSpecialisation.toLowerCase() === s.toLowerCase();
                      return (
                        <button
                          key={s}
                          onClick={() => toggleSpecialisation(s)}
                          className={`px-3 py-1.5 border rounded-full text-xs font-semibold capitalize transition-all cursor-pointer ${
                            isActive
                              ? 'bg-nyaya-green border-nyaya-green text-white shadow-sm shadow-nyaya-green/10'
                              : 'bg-white border-black/10 text-nyaya-text-dark hover:border-nyaya-green-mid hover:text-nyaya-green-mid'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Max Fee Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-semibold text-xs text-nyaya-muted uppercase tracking-wider">Max Fee</label>
                    <span className="text-xs text-nyaya-green font-bold">
                      {maxFee === '' ? 'Any' : `₹${maxFee}/hr`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="500"
                    value={maxFee === '' ? 10000 : maxFee}
                    onChange={(e) => setMaxFee(e.target.value === '10000' && maxFee === '' ? '' : Number(e.target.value))}
                    className="w-full accent-nyaya-green h-2 bg-nyaya-warm rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-nyaya-muted mt-2 font-medium">
                    <span>Free</span>
                    <span>₹10,000+</span>
                  </div>
                </div>

                {/* Free consultation & availability checkboxes */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-center space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={offersFreeConsultation}
                      onChange={(e) => setOffersFreeConsultation(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-nyaya-green rounded bg-white border-black/10 focus:ring-nyaya-green"
                    />
                    <span className="font-medium text-nyaya-text-dark">Offers Free Initial Consultation</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={availableOnly}
                      onChange={(e) => setAvailableOnly(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-nyaya-green rounded bg-white border-black/10 focus:ring-nyaya-green"
                    />
                    <span className="font-medium text-nyaya-text-dark">Available Now (live match)</span>
                  </label>
                </div>
                
                {showFiltersMobile && (
                  <button
                    onClick={() => setShowFiltersMobile(false)}
                    className="w-full py-3 bg-nyaya-green hover:bg-nyaya-green-mid text-white rounded-xl font-bold transition shadow-md shadow-nyaya-green/10"
                  >
                    Apply Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Area + Integrated Map (Right) */}
          <div className="flex-grow w-full">
            
            {/* Desktop Search Bar */}
            <div className="hidden md:flex mb-6 relative">
              <input
                type="text"
                placeholder="Search lawyers by name, city, or specialization..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-black/8 text-nyaya-text-dark rounded-xl shadow-sm focus:outline-none focus:ring-1 focus:ring-nyaya-green/20 focus:border-nyaya-green text-base"
              />
              <Search size={18} className="absolute left-4 top-4 text-nyaya-muted" />
            </div>

            {/* Embedded Expandable Map Panel */}
            <div className="mb-6 rounded-2xl overflow-hidden border border-black/8 shadow-sm bg-white transition-all duration-300">
              <div className="flex items-center justify-between px-4 py-3 bg-nyaya-warm/60 border-b border-black/5">
                <div className="flex items-center gap-2 text-nyaya-text-dark">
                  <Map size={16} className="text-nyaya-green" />
                  <span className="text-xs font-bold uppercase tracking-wider font-serif">Advocate Interactive Map (नक्शा)</span>
                </div>
                <button
                  onClick={() => setMapOpen(!mapOpen)}
                  className="text-[10px] font-bold text-nyaya-muted hover:text-nyaya-text-dark px-2.5 py-1 rounded bg-black/5 hover:bg-black/10 transition"
                >
                  {mapOpen ? 'Hide Map ▲' : 'Show Map ▼'}
                </button>
              </div>
              
              {mapOpen && (
                <div className="h-[320px] w-full relative">
                  <AdvocateMap
                    initialLat={center.lat}
                    initialLon={center.lng}
                    mode="advocate"
                    lawyers={filteredLawyers}
                    selectedLawyerId={selectedLawyerId}
                    onAdvocateSelect={handleAdvocateSelect}
                    showFilters={false}
                    className="!border-0 !rounded-none"
                  />
                </div>
              )}
            </div>

            {/* Results Title Count */}
            <div className="mb-4 text-sm text-nyaya-muted font-semibold flex items-center justify-between">
              <span>Showing {filteredLawyers.length} verified advocates</span>
              {loadingDb && (
                <span className="w-4 h-4 border-2 border-nyaya-green border-t-transparent rounded-full animate-spin"></span>
              )}
            </div>

            {/* Advocate Card Grid */}
            {filteredLawyers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-black/8 rounded-2xl border-dashed">
                <Search size={40} className="text-nyaya-muted mb-4 stroke-[1.5]" />
                <h3 className="font-semibold text-nyaya-text-dark text-base font-serif">No Matching Advocates Found</h3>
                <p className="text-sm text-nyaya-muted mt-2 max-w-[280px] leading-relaxed">
                  Try clearing your search filters, adjusting the maximum hourly fee, or typing another name.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredLawyers.map(lawyer => {
                  const isSelected = lawyer.id === selectedLawyerId;
                  
                  // Map properties from LawyerMapPin to LawyerResult expected by LawyerCard
                  const mappedLawyer = {
                    id: lawyer.id,
                    full_name: lawyer.full_name,
                    specialisations: lawyer.specialisations,
                    city: lawyer.city,
                    state: '', 
                    experience_years: lawyer.experience_years,
                    fee_per_hour_inr: lawyer.fee_per_hour_inr,
                    offers_free_consultation: lawyer.fee_per_hour_inr === 0, 
                    rating: lawyer.average_rating,
                    review_count: lawyer.total_reviews,
                    languages: lawyer.languages,
                  };

                  return (
                    <div
                      key={lawyer.id}
                      id={`lawyer-card-${lawyer.id}`}
                      onClick={() => setSelectedLawyerId(lawyer.id)}
                      className={`transition-all duration-300 rounded-2xl border cursor-pointer h-full ${
                        isSelected
                          ? 'border-nyaya-green shadow-lg shadow-nyaya-green/10 ring-1 ring-nyaya-green/20 scale-[1.01]'
                          : 'border-black/5 hover:border-black/10'
                      }`}
                    >
                      <LawyerCard lawyer={mappedLawyer} compact={false} />
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

      </div>
    </AppShell>
  );
}

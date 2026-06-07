import { api } from './client';

export interface LawyerMapFilters {
  specialisation?: string;
  language?: string;
  max_fee?: number;
  available_only?: boolean;
  limit?: number;
}

export interface LawyerMapPin {
  id: string;
  full_name: string;
  specialisations: string[];
  experience_years: number;
  city: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
  fee_per_hour_inr: number;
  average_rating: number;
  total_reviews: number;
  languages: string[];
  is_available: boolean;
  profile_photo_url?: string;
  score: number;
}

export interface LawyerMapResponse {
  lawyers: LawyerMapPin[];
  center: { latitude: number; longitude: number };
  total_count: number;
  radius_km: number;
}

export interface PlaceItem {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  types: string[];
  distance_km: number;
}

export interface NearbyPlacesResponse {
  category: string;
  places: PlaceItem[];
  center: { latitude: number; longitude: number };
}

export interface GeocodeResponse {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

export const lawyerApi = {
  // Map and Geocoding APIs
  getMapPins: async (params: {
    lat?: number;
    lon?: number;
    city?: string;
    state?: string;
    radius_km?: number;
    specialisation?: string;
    language?: string;
    max_fee?: number;
    available_only?: boolean;
    limit?: number;
  }): Promise<LawyerMapResponse> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    return api.get(`/api/v1/lawyers/map?${query.toString()}`);
  },

  geocodeAddress: async (address: string): Promise<GeocodeResponse> => {
    return api.get(`/api/v1/lawyers/geocode?address=${encodeURIComponent(address)}`);
  },

  getNearbyPlaces: async (
    lat: number,
    lon: number,
    category: 'police' | 'court' | 'legal_aid',
    radiusMeters = 5000
  ): Promise<NearbyPlacesResponse> => {
    return api.get(
      `/api/v1/maps/nearby?lat=${lat}&lon=${lon}&category=${category}&radius_meters=${radiusMeters}`
    );
  },

  // Lawyer Profile Dashboard APIs
  getMeProfile: async (): Promise<any> => {
    return api.get('/api/v1/lawyers/me/profile');
  },

  updateMeProfile: async (data: any): Promise<any> => {
    return api.patch('/api/v1/lawyers/me/profile', data);
  },

  toggleAvailability: async (isAvailable: boolean): Promise<any> => {
    return api.patch('/api/v1/lawyers/me/availability', { is_available: isAvailable });
  },

  getDashboardStats: async (): Promise<any> => {
    return api.get('/api/v1/lawyers/me/stats');
  },

  getActivityFeed: async (): Promise<any[]> => {
    return api.get('/api/v1/lawyers/me/activity');
  },

  getRankingInsight: async (): Promise<any> => {
    return api.get('/api/v1/lawyers/me/ranking');
  },

  // Client Requests
  getRequests: async (params?: {
    status?: string;
    category?: string;
    urgency?: string;
  }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) query.append(key, String(val));
      });
    }
    return api.get(`/api/v1/lawyers/me/requests?${query.toString()}`);
  },

  respondToRequest: async (
    requestId: string,
    data: { message: string; availability_slots: string[]; fee: number; free_consultation: boolean }
  ): Promise<any> => {
    return api.patch(`/api/v1/lawyers/me/requests/${requestId}/respond`, data);
  },

  declineRequest: async (requestId: string): Promise<any> => {
    return api.patch(`/api/v1/lawyers/me/requests/${requestId}/decline`, {});
  },

  // Reviews
  getReviews: async (): Promise<any> => {
    return api.get('/api/v1/lawyers/me/reviews');
  },

  // Notifications
  getNotifications: async (): Promise<any[]> => {
    return api.get('/api/v1/lawyers/me/notifications');
  },

  markNotificationRead: async (notificationId: string): Promise<any> => {
    return api.patch(`/api/v1/lawyers/me/notifications/${notificationId}/read`, {});
  },

  contactLawyer: async (
    lawyerId: string,
    data: {
      category: string;
      situation_summary: string;
      user_city: string;
      user_language: string;
      urgency: string;
      user_phone?: string;
    }
  ): Promise<any> => {
    return api.post(`/api/v1/lawyers/${lawyerId}/contact`, data);
  },
};

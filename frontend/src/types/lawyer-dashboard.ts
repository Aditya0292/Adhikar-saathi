// ═══════════════════════════════════════════════════════════════
// Advocate Dashboard — Shared TypeScript Interfaces
// All mock data and API responses MUST conform to these shapes.
// ═══════════════════════════════════════════════════════════════

export interface LawyerProfile {
  id: string;
  auth_id: string;
  full_name: string;
  email: string;
  phone?: string;
  bio?: string;
  profile_photo_url?: string;
  specialisations: string[];
  court_jurisdictions: string[];
  experience_years: number;
  languages: string[];
  city: string;
  state: string;
  pincode: string;
  fee_per_hour_inr: number;
  offers_free_consultation: boolean;
  bar_enrollment_number: string;
  state_bar_council: string;
  enrollment_year: number;
  is_verified: boolean;
  verification_status: string;
  is_available: boolean;
  rejection_reason?: string;
  // Document paths (read-only display)
  enrollment_certificate_path?: string;
  certificate_of_practice_path?: string;
  government_id_path?: string;
  government_id_type?: string;
  government_id_last4?: string;
}

export interface DashboardStats {
  profile_views: number;
  profile_views_delta: number;
  pending_requests: number;
  response_rate: number;       // 0-100
  avg_rating: number;          // 0-5
  total_reviews: number;
}

export interface ClientRequest {
  id: string;
  category: string;
  situation_summary: string;
  user_city: string;
  user_language: string;
  urgency: 'normal' | 'urgent';
  status: 'pending' | 'responded' | 'declined' | 'expired';
  created_at: string;          // ISO datetime
  expires_at: string;          // ISO datetime
  responded_at?: string;
  response_message?: string;
  availability_slots?: string[];
  response_fee_inr?: number;
  // Revealed only after responding:
  user_email?: string;
  user_phone?: string;
}

export interface ActivityItem {
  id: string;
  icon: string;                // emoji
  text: string;
  timestamp: string;           // ISO datetime
}

export interface RankingInsight {
  rank: number;
  total: number;
  city: string;
  specialisation: string;
  factors: RankingFactor[];
}

export interface RankingFactor {
  label: string;
  status: 'good' | 'warning' | 'bad';
  detail: string;
  weight: 'high' | 'medium' | 'low';
  tip: string;
}

export interface LawyerNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ReviewItem {
  id: string;
  rating: number;              // 1-5
  text: string;
  category?: string;
  created_at: string;
  client_name?: string;        // first name only
  reply?: string;
  replied_at?: string;
}

export interface ReviewSummary {
  avg_rating: number;
  total_reviews: number;
  distribution: { stars: number; count: number }[];
}

export interface ConsultationItem {
  id: string;
  client_name: string;         // first name only
  category: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'upcoming' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  review_rating?: number;
}

export interface ConsultationStats {
  total_this_month: number;
  completion_rate: number;
  avg_duration_minutes: number;
  revenue_this_month: number;
}

export type DashboardTab = 'overview' | 'requests' | 'profile' | 'consultations' | 'reviews' | 'visibility' | 'settings';

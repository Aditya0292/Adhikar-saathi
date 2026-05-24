from pydantic import BaseModel, Field, EmailStr
from typing import Literal, List, Optional
from datetime import datetime

STATE_BAR_COUNCILS = [
    "Bar Council of Delhi",
    "Bar Council of Maharashtra & Goa",
    "Bar Council of Karnataka",
    "Bar Council of Tamil Nadu",
    "Bar Council of Kerala",
    "Bar Council of Andhra Pradesh",
    "Bar Council of Telangana",
    "Bar Council of Gujarat",
    "Bar Council of Rajasthan",
    "Bar Council of Punjab & Haryana",
    "Bar Council of Uttar Pradesh",
    "Bar Council of West Bengal",
    "Bar Council of Madhya Pradesh",
    "Bar Council of Bihar",
    "Bar Council of Odisha",
    "Bar Council of Assam, Nagaland, Mizoram, & Arunachal Pradesh",
    "Bar Council of Himachal Pradesh",
    "Bar Council of Uttarakhand",
    "Bar Council of Jharkhand",
    "Bar Council of Chhattisgarh",
    "Bar Council of Jammu & Kashmir",
]

# ── Registration ───────────────────────────────────────────────
class LawyerRegistrationStep1(BaseModel):
    full_name: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    phone: Optional[str] = Field(None, pattern=r"^\+91[0-9]{10}$")
    
    # Bar Council fields
    bar_enrollment_number: str = Field(
        pattern=r"^[A-Z]{1,4}/\d{4}/\d{3,6}$",
        description="Format: STATE/YEAR/NUMBER e.g. MH/2019/34521"
    )
    state_bar_council: str
    enrollment_year: int = Field(ge=1961, le=datetime.now().year)
    
    # Professional fields
    specialisations: List[str] = Field(min_length=1, max_length=5)
    court_jurisdictions: List[str] = Field(default=[])
    experience_years: int = Field(ge=0, le=60)
    languages: List[str] = Field(min_length=1)
    
    # Location
    city: str = Field(min_length=2, max_length=100)
    state: str
    pincode: str = Field(pattern=r"^\d{6}$")
    
    # Fees
    fee_per_hour_inr: int = Field(ge=0, le=100000)
    offers_free_consultation: bool = False
    
    # Government ID
    government_id_type: Literal["aadhaar", "voter_id", "passport"]
    government_id_last4: str = Field(pattern=r"^\d{4}$")

class LawyerVerificationStatus(BaseModel):
    verification_status: str
    rejection_reason: Optional[str] = None
    is_verified: bool

class AdminVerifyLawyerAction(BaseModel):
    action: Literal["approve", "reject"]
    rejection_reason: Optional[str] = None

# ── Dashboard Profile ──────────────────────────────────────────
class LawyerFullProfile(BaseModel):
    id: str
    auth_id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = None
    specialisations: List[str] = []
    court_jurisdictions: List[str] = []
    experience_years: int = 0
    languages: List[str] = []
    city: str = ""
    state: str = ""
    pincode: str = ""
    fee_per_hour_inr: int = 0
    offers_free_consultation: bool = False
    bar_enrollment_number: str = ""
    state_bar_council: str = ""
    enrollment_year: int = 2020
    is_verified: bool = False
    verification_status: str = "pending"
    is_available: bool = True
    rejection_reason: Optional[str] = None
    enrollment_certificate_path: Optional[str] = None
    certificate_of_practice_path: Optional[str] = None
    government_id_path: Optional[str] = None
    government_id_type: Optional[str] = None
    government_id_last4: Optional[str] = None

class LawyerProfileUpdate(BaseModel):
    bio: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, pattern=r"^\+91[0-9]{10}$")
    email: Optional[EmailStr] = None
    specialisations: Optional[List[str]] = Field(None, max_length=5)
    court_jurisdictions: Optional[List[str]] = None
    experience_years: Optional[int] = Field(None, ge=0, le=60)
    languages: Optional[List[str]] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    fee_per_hour_inr: Optional[int] = Field(None, ge=0, le=100000)
    offers_free_consultation: Optional[bool] = None

class AvailabilityToggle(BaseModel):
    is_available: bool

# ── Dashboard Stats ────────────────────────────────────────────
class LawyerDashboardStats(BaseModel):
    profile_views: int = 0
    profile_views_delta: int = 0
    pending_requests: int = 0
    response_rate: float = 0.0
    avg_rating: float = 0.0
    total_reviews: int = 0

class ActivityItem(BaseModel):
    id: str
    icon: str
    text: str
    timestamp: datetime

class RankingFactor(BaseModel):
    label: str
    status: Literal["good", "warning", "bad"]
    detail: str
    weight: Literal["high", "medium", "low"]
    tip: str

class RankingInsight(BaseModel):
    rank: int
    total: int
    city: str
    specialisation: str
    factors: List[RankingFactor]

# ── Client Requests ────────────────────────────────────────────
class ClientRequestItem(BaseModel):
    id: str
    category: str
    situation_summary: str
    user_city: str
    user_language: str = "en"
    urgency: Literal["normal", "urgent"] = "normal"
    status: Literal["pending", "responded", "declined", "expired"] = "pending"
    created_at: datetime
    expires_at: datetime
    responded_at: Optional[datetime] = None
    response_message: Optional[str] = None
    availability_slots: Optional[List[str]] = None
    response_fee_inr: Optional[int] = None
    user_email: Optional[str] = None
    user_phone: Optional[str] = None

class ClientRequestRespond(BaseModel):
    message: str = Field(min_length=10, max_length=2000)
    availability_slots: List[str] = Field(default=[], max_length=3)
    fee: int = Field(ge=0, le=100000)
    free_consultation: bool = False

# ── Client Request Creation ────────────────────────────────────
class CreateClientRequest(BaseModel):
    query_log_id: Optional[str] = None
    category: str
    user_city: str
    user_language: str = "en"
    urgency: Literal["normal", "urgent"] = "normal"
    situation_summary: Optional[str] = None
    user_lat: Optional[float] = None
    user_lon: Optional[float] = None

# ── Reviews ────────────────────────────────────────────────────
class ReviewReply(BaseModel):
    reply: str = Field(min_length=5, max_length=1000)

# ── Notifications ──────────────────────────────────────────────
class LawyerNotificationItem(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str] = None
    is_read: bool = False
    metadata: Optional[dict] = None
    created_at: datetime

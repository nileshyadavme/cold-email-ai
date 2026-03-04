from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ── Auth ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ── User / Plan ───────────────────────────────────────────────────────

class PlanType(str, Enum):
    free = "free"
    pro = "pro"
    business = "business"


class UserProfile(BaseModel):
    user_id: str
    email: str
    name: str
    plan: PlanType
    emails_used_this_month: int
    emails_limit: int


# ── Prospect ─────────────────────────────────────────────────────────

class ProspectInput(BaseModel):
    url: Optional[str] = None           # LinkedIn or company URL to scrape
    name: Optional[str] = None          # Or provide manually
    role: Optional[str] = None
    company: Optional[str] = None
    about: Optional[str] = None         # Extra context


class ProspectData(BaseModel):
    name: str
    role: str
    company: str
    about: str
    recent_news: Optional[str] = None
    scraped_from: Optional[str] = None


# ── Email Generation ─────────────────────────────────────────────────

class EmailTone(str, Enum):
    professional = "professional"
    friendly = "friendly"
    direct = "direct"
    creative = "creative"


class GenerateEmailRequest(BaseModel):
    prospect: ProspectInput
    sender_name: str
    sender_company: str
    sender_value_prop: str              # What you're offering
    tone: EmailTone = EmailTone.professional
    cta: str = "a 15-minute call"       # Call to action
    extra_context: Optional[str] = None


class GeneratedEmail(BaseModel):
    subject: str
    body: str
    reasoning: str                      # Chain-of-thought explanation
    prospect_name: str
    prospect_company: str
    tone_used: str
    generated_at: datetime


class EmailRecord(BaseModel):
    id: str
    subject: str
    body: str
    prospect_name: str
    prospect_company: str
    tone_used: str
    created_at: datetime


# ── Bulk ─────────────────────────────────────────────────────────────

class BulkJobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class BulkJobResponse(BaseModel):
    job_id: str
    total_prospects: int
    status: BulkJobStatus
    message: str


class BulkJobResult(BaseModel):
    job_id: str
    status: BulkJobStatus
    total: int
    completed: int
    failed: int
    emails: List[EmailRecord] = []


# ── Billing ──────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: PlanType
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str

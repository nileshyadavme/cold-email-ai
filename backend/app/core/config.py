from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Cold Email AI"
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7   # 7 days

    # Gemini
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRO_PRICE_ID: str = ""
    STRIPE_BUSINESS_PRICE_ID: str = ""

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./cold_email.db"

    # Rate limits per plan (emails per month)
    FREE_LIMIT: int = 5
    PRO_LIMIT: int = 500
    BUSINESS_LIMIT: int = 999999

    # Scraping
    SCRAPE_TIMEOUT: int = 15
    MAX_BULK_PROSPECTS: int = 100

    # CORS
    FRONTEND_URL: str = ""
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://cold-email-ai-ecru.vercel.app",
    ]

    class Config:
        env_file = ".env"


settings = Settings()


# Plan limits mapping
PLAN_LIMITS = {
    "free": settings.FREE_LIMIT,
    "pro": settings.PRO_LIMIT,
    "business": settings.BUSINESS_LIMIT,
}

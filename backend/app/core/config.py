from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Cold Email AI"
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7   # 7 days

    # Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL")

    # Stripe
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET")
    STRIPE_PRO_PRICE_ID: str = os.getenv("STRIPE_PRO_PRICE_ID")
    STRIPE_BUSINESS_PRICE_ID: str = os.getenv("STRIPE_BUSINESS_PRICE_ID")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL")

    # Rate limits per plan (emails per month)
    FREE_LIMIT: int = 5
    PRO_LIMIT: int = 500
    BUSINESS_LIMIT: int = 999999

    # Scraping
    SCRAPE_TIMEOUT: int = 15
    MAX_BULK_PROSPECTS: int = 100

    # CORS - add production URL via FRONTEND_URL env var (set in Railway/Vercel)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL")
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://cold-email-ai-ecru.vercel.app"
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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, emails, users
from app.core.config import settings
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)

app = FastAPI(
    title="Cold Email AI API",
    description="AI-powered cold email personalizer with Stripe billing.",
    version="1.0.0",
)

origins = settings.ALLOWED_ORIGINS.copy()
if settings.FRONTEND_URL:
    origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,   prefix="/api/auth",   tags=["Auth"])
app.include_router(emails.router, prefix="/api/emails", tags=["Emails"])
app.include_router(users.router,  prefix="/api/users",  tags=["Users"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cold-email-ai"}

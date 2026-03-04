from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import auth, emails, users
from app.core.config import settings
from app.services.stripe_service import handle_webhook
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cold Email AI API",
    description="AI-powered cold email personalizer with Stripe billing.",
    version="1.0.0",
)

origins = settings.ALLOWED_ORIGINS.copy()
if settings.FRONTEND_URL and settings.FRONTEND_URL not in origins:
    origins.append(settings.FRONTEND_URL)

logger.info(f"CORS allowed origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions so CORS headers are always present in the response."""
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check Railway logs for details."},
    )


app.include_router(auth.router,   prefix="/api/auth",   tags=["Auth"])
app.include_router(emails.router, prefix="/api/emails", tags=["Emails"])
app.include_router(users.router,  prefix="/api/users",  tags=["Users"])


@app.post("/api/payments/webhook", tags=["Payments"])
async def payments_webhook(request: Request):
    """Dedicated Stripe webhook endpoint — configured in Stripe dashboard."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    return await handle_webhook(payload, sig)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cold-email-ai", "cors_origins": origins}

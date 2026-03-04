"""
Redis Service
Handles:
- Per-user monthly email quota (rate limiting)
- Bulk job status tracking
- Simple in-memory user store (replace with PostgreSQL in production)
"""

import json
import redis.asyncio as aioredis
from datetime import datetime
from typing import Optional
from app.core.config import settings, PLAN_LIMITS

# Async Redis client
redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return redis_client


# ── Rate Limiting ─────────────────────────────────────────────────────

# ── Helpers ───────────────────────────────────────────────────────────

def _normalize_plan(plan: str) -> str:
    """Normalize plan string (handle enums and potential 'PlanType.business' string reps)."""
    if hasattr(plan, "value"):
        plan = plan.value
    return str(plan).lower().split(".")[-1]


def _quota_key(user_id: str) -> str:
    """Monthly quota key: resets on first day of each month."""
    month = datetime.utcnow().strftime("%Y-%m")
    return f"quota:{user_id}:{month}"


async def check_and_increment_quota(user_id: str, plan: str) -> dict:
    """
    Check if user is within their monthly quota.
    Atomically increment if allowed.
    Returns: {"allowed": bool, "used": int, "limit": int}
    """
    r = await get_redis()
    key = _quota_key(user_id)
    limit = PLAN_LIMITS.get(_normalize_plan(plan), PLAN_LIMITS["free"])

    # Get current usage
    current = await r.get(key)
    used = int(current) if current else 0

    if used >= limit:
        return {"allowed": False, "used": used, "limit": limit}

    # Increment (set TTL to 35 days to cover month boundaries)
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, 60 * 60 * 24 * 35)
    await pipe.execute()

    return {"allowed": True, "used": used + 1, "limit": limit}


async def get_quota_usage(user_id: str, plan: str) -> dict:
    """Get current quota usage without incrementing."""
    r = await get_redis()
    key = _quota_key(user_id)
    limit = PLAN_LIMITS.get(_normalize_plan(plan), PLAN_LIMITS["free"])
    current = await r.get(key)
    used = int(current) if current else 0
    return {"used": used, "limit": limit, "remaining": max(0, limit - used)}


# ── User Store (simple Redis hash — replace with DB in production) ────

def _user_key(user_id: str) -> str:
    return f"user:{user_id}"


async def save_user(user_id: str, data: dict):
    r = await get_redis()
    await r.hset(_user_key(user_id), mapping={k: json.dumps(v) for k, v in data.items()})


async def get_user(user_id: str) -> Optional[dict]:
    r = await get_redis()
    raw = await r.hgetall(_user_key(user_id))
    if not raw:
        return None
    return {k: json.loads(v) for k, v in raw.items()}


async def get_user_by_email(email: str) -> Optional[dict]:
    """Scan all users by email (fine for demo; use DB index in production)."""
    r = await get_redis()
    keys = await r.keys("user:*")
    for key in keys:
        raw = await r.hgetall(key)
        if raw:
            data = {k: json.loads(v) for k, v in raw.items()}
            if data.get("email") == email:
                return data
    return None


async def update_user_plan(user_id: str, plan: str, stripe_customer_id: str = ""):
    r = await get_redis()
    key = _user_key(user_id)
    plan = _normalize_plan(plan)

    await r.hset(key, mapping={
        "plan": json.dumps(plan),
        "stripe_customer_id": json.dumps(stripe_customer_id),
    })
    # Reset the current month's quota so new plan limits take effect immediately
    quota_key = _quota_key(user_id)
    await r.delete(quota_key)


# ── Email History ─────────────────────────────────────────────────────

def _history_key(user_id: str) -> str:
    return f"history:{user_id}"


async def save_email_to_history(user_id: str, email_data: dict):
    r = await get_redis()
    key = _history_key(user_id)
    await r.lpush(key, json.dumps(email_data))
    await r.ltrim(key, 0, 99)   # keep last 100 emails per user


async def get_email_history(user_id: str, limit: int = 20) -> list:
    r = await get_redis()
    key = _history_key(user_id)
    items = await r.lrange(key, 0, limit - 1)
    return [json.loads(i) for i in items]


# ── Bulk Job Status ───────────────────────────────────────────────────

def _job_key(job_id: str) -> str:
    return f"job:{job_id}"


async def set_job_status(job_id: str, data: dict, ttl: int = 3600):
    r = await get_redis()
    await r.setex(_job_key(job_id), ttl, json.dumps(data))


async def get_job_status(job_id: str) -> Optional[dict]:
    r = await get_redis()
    raw = await r.get(_job_key(job_id))
    return json.loads(raw) if raw else None


async def update_job_progress(job_id: str, completed: int, failed: int, emails: list):
    existing = await get_job_status(job_id)
    if existing:
        existing.update({"completed": completed, "failed": failed, "emails": emails})
        await set_job_status(job_id, existing)

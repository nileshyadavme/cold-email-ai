import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import (
    GenerateEmailRequest, GeneratedEmail, BulkJobResponse,
    BulkJobResult, BulkJobStatus
)
from app.core.security import get_current_user
from app.services.scraper_service import scraper
from app.services.email_service import generate_email
from app.services.redis_service import (
    check_and_increment_quota, get_user, get_quota_usage,
    save_email_to_history, get_email_history, set_job_status, get_job_status
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=GeneratedEmail)
async def generate_single_email(
    req: GenerateEmailRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a single personalised cold email.
    Scrapes URL if provided, otherwise uses manual prospect info.
    """
    user_id = current_user["user_id"]
    user = await get_user(user_id)
    plan = user.get("plan", "free") if user else "free"

    # Check quota
    quota = await check_and_increment_quota(user_id, plan)
    if not quota["allowed"]:
        raise HTTPException(
            status_code=429,
            detail=f"Monthly limit reached ({quota['limit']} emails). Upgrade your plan.",
        )

    # Scrape or build prospect data
    if req.prospect.url:
        logger.info(f"Scraping URL: {req.prospect.url}")
        prospect = await scraper.scrape(req.prospect.url)
        # Allow manual overrides
        if req.prospect.name:
            prospect.name = req.prospect.name
        if req.prospect.role:
            prospect.role = req.prospect.role
        if req.prospect.company:
            prospect.company = req.prospect.company
    else:
        from app.models.schemas import ProspectData
        prospect = ProspectData(
            name=req.prospect.name or "Decision Maker",
            role=req.prospect.role or "Key Stakeholder",
            company=req.prospect.company or "Their Company",
            about=req.prospect.about or "",
        )

    # Generate email
    result = await generate_email(req, prospect)

    # Save to history
    await save_email_to_history(user_id, {
        "id": str(uuid.uuid4()),
        "subject": result.subject,
        "body": result.body,
        "prospect_name": result.prospect_name,
        "prospect_company": result.prospect_company,
        "tone_used": result.tone_used,
        "created_at": result.generated_at.isoformat(),
    })

    return result


@router.get("/history")
async def get_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """Return the user's email generation history."""
    history = await get_email_history(current_user["user_id"], limit=limit)
    return {"emails": history, "total": len(history)}


@router.get("/quota")
async def get_quota(current_user: dict = Depends(get_current_user)):
    """Return the user's current quota usage."""
    user_id = current_user["user_id"]
    user = await get_user(user_id)
    plan = user.get("plan", "free") if user else "free"
    usage = await get_quota_usage(user_id, plan)
    return {**usage, "plan": plan}


@router.post("/bulk", response_model=BulkJobResponse)
async def start_bulk_job(
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """
    Start a background job to generate emails for multiple prospects.
    Accepts: { prospects: [...], sender_info: {...} }
    Returns a job_id to poll for status.
    """
    from arq import create_pool
    from arq.connections import RedisSettings
    from app.core.config import settings

    prospects = payload.get("prospects", [])
    sender_info = payload.get("sender_info", {})

    if not prospects:
        raise HTTPException(status_code=400, detail="No prospects provided")
    if len(prospects) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 prospects per bulk job")

    user_id = current_user["user_id"]
    user = await get_user(user_id)
    plan = user.get("plan", "free") if user else "free"
    job_id = str(uuid.uuid4())

    # Save initial job status
    await set_job_status(job_id, {
        "status": "queued",
        "total": len(prospects),
        "completed": 0,
        "failed": 0,
        "emails": [],
        "message": "Job queued, processing will start shortly",
    })

    # Enqueue ARQ job
    redis_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    await redis_pool.enqueue_job(
        "process_bulk_job",
        job_id=job_id,
        prospects=prospects,
        sender_info=sender_info,
        user_id=user_id,
        plan=plan,
    )
    await redis_pool.close()

    return BulkJobResponse(
        job_id=job_id,
        total_prospects=len(prospects),
        status=BulkJobStatus.queued,
        message=f"Job queued. {len(prospects)} prospects will be processed.",
    )


@router.get("/bulk/{job_id}", response_model=BulkJobResult)
async def get_bulk_status(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Poll for the status of a bulk generation job."""
    job = await get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return BulkJobResult(
        job_id=job_id,
        status=BulkJobStatus(job.get("status", "queued")),
        total=job.get("total", 0),
        completed=job.get("completed", 0),
        failed=job.get("failed", 0),
        emails=job.get("emails", []),
    )

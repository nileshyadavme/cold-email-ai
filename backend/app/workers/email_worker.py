"""
ARQ Async Worker — Bulk Email Generation
Processes bulk prospect lists in the background.
Run with: arq app.workers.email_worker.WorkerSettings
"""

import logging
import uuid
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.models.schemas import GenerateEmailRequest, ProspectInput, EmailTone
from app.services.scraper_service import scraper
from app.services.email_service import generate_email
from app.services.redis_service import (
    set_job_status, update_job_progress, check_and_increment_quota
)

logger = logging.getLogger(__name__)


async def process_bulk_job(
    ctx: dict,
    job_id: str,
    prospects: list,
    sender_info: dict,
    user_id: str,
    plan: str,
):
    """
    ARQ worker task: process a list of prospects and generate emails.
    Updates job status in Redis as it progresses.
    """
    logger.info(f"Starting bulk job {job_id} with {len(prospects)} prospects")

    completed = 0
    failed = 0
    emails = []

    for i, prospect_data in enumerate(prospects):
        try:
            # Check quota per email
            quota = await check_and_increment_quota(user_id, plan)
            if not quota["allowed"]:
                logger.warning(f"Quota exceeded for user {user_id}, stopping at {i}")
                await set_job_status(job_id, {
                    "status": "completed",
                    "total": len(prospects),
                    "completed": completed,
                    "failed": failed + (len(prospects) - i),
                    "emails": emails,
                    "message": f"Quota exceeded after {completed} emails",
                })
                return

            # Build prospect input
            prospect_input = ProspectInput(
                url=prospect_data.get("url"),
                name=prospect_data.get("name"),
                role=prospect_data.get("role"),
                company=prospect_data.get("company"),
                about=prospect_data.get("about"),
            )

            # Scrape if URL provided, otherwise use manual data
            if prospect_input.url:
                prospect = await scraper.scrape(prospect_input.url)
                # Override with any manually provided fields
                if prospect_input.name:
                    prospect.name = prospect_input.name
                if prospect_input.role:
                    prospect.role = prospect_input.role
                if prospect_input.company:
                    prospect.company = prospect_input.company
            else:
                from app.models.schemas import ProspectData
                prospect = ProspectData(
                    name=prospect_input.name or "Decision Maker",
                    role=prospect_input.role or "Key Stakeholder",
                    company=prospect_input.company or "Their Company",
                    about=prospect_input.about or "",
                )

            # Generate email
            req = GenerateEmailRequest(
                prospect=prospect_input,
                sender_name=sender_info["sender_name"],
                sender_company=sender_info["sender_company"],
                sender_value_prop=sender_info["sender_value_prop"],
                tone=EmailTone(sender_info.get("tone", "professional")),
                cta=sender_info.get("cta", "a 15-minute call"),
            )

            result = await generate_email(req, prospect)

            emails.append({
                "id": str(uuid.uuid4()),
                "subject": result.subject,
                "body": result.body,
                "prospect_name": result.prospect_name,
                "prospect_company": result.prospect_company,
                "tone_used": result.tone_used,
                "created_at": result.generated_at.isoformat(),
            })
            completed += 1

        except Exception as e:
            logger.error(f"Failed to process prospect {i}: {e}")
            failed += 1

        # Update progress every 5 emails
        if (i + 1) % 5 == 0:
            await update_job_progress(job_id, completed, failed, emails)

    # Final status update
    await set_job_status(job_id, {
        "status": "completed",
        "total": len(prospects),
        "completed": completed,
        "failed": failed,
        "emails": emails,
        "message": f"Done: {completed} emails generated",
    })

    logger.info(f"Bulk job {job_id} complete: {completed} ok, {failed} failed")


class WorkerSettings:
    """ARQ worker configuration."""
    functions = [process_bulk_job]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_jobs = 10
    job_timeout = 600       # 10 min max per job
    keep_result = 3600      # keep results 1 hour

"""
Email Generation Service
Uses GPT-4o with chain-of-thought prompting to generate
hyper-personalised cold emails based on scraped prospect data.
"""

import logging
from datetime import datetime
from google import genai
from google.genai import types
from app.core.config import settings
from app.models.schemas import (
    GenerateEmailRequest, GeneratedEmail, ProspectData
)

logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.GEMINI_API_KEY)


SYSTEM_PROMPT = """You are an expert cold email copywriter who has written emails
with 40%+ open rates and 15%+ reply rates. You write emails that feel genuinely
personal, never generic.

Your process (chain-of-thought):
1. ANALYSE the prospect — what do they care about? What are their pain points?
2. CONNECT the sender's value proposition to the prospect's specific situation
3. CRAFT a subject line that creates curiosity without clickbait
4. WRITE the email: short (4-6 sentences), specific, one clear CTA

Rules:
- NEVER start with "I hope this email finds you well" or any generic opener
- Lead with THEM, not you — first sentence is about the prospect
- Be specific — mention their company, role, or recent activity
- One ask only — don't pile on multiple CTAs
- Keep it under 120 words for the body
- Sound human, not like a bot wrote it

Output FORMAT (strictly follow this JSON structure):
{
  "reasoning": "2-3 sentences explaining your personalisation strategy",
  "subject": "the subject line",
  "body": "the full email body"
}"""


def _build_user_prompt(req: GenerateEmailRequest, prospect: ProspectData) -> str:
    tone_instructions = {
        "professional": "formal but warm, like a respected industry peer",
        "friendly": "casual and conversational, like reaching out to a future colleague",
        "direct": "no fluff, get to the point fast, respect their time",
        "creative": "memorable and unexpected, stand out from 100 other cold emails",
    }

    return f"""Write a cold email with these details:

PROSPECT INFO:
- Name: {prospect.name}
- Role: {prospect.role}
- Company: {prospect.company}
- About them/company: {prospect.about}
{f"- Recent news: {prospect.recent_news}" if prospect.recent_news else ""}
{f"- Extra context: {req.extra_context}" if req.extra_context else ""}

SENDER INFO:
- Name: {req.sender_name}
- Company: {req.sender_company}
- What we offer: {req.sender_value_prop}

EMAIL SETTINGS:
- Tone: {tone_instructions.get(req.tone, req.tone)}
- Call to action: Ask for {req.cta}

Remember: Be hyper-specific to {prospect.name} at {prospect.company}.
Do NOT write a generic email that could be sent to anyone."""


async def generate_email(
    req: GenerateEmailRequest,
    prospect: ProspectData,
) -> GeneratedEmail:
    """
    Generate a personalised cold email using GPT-4o.
    Returns structured GeneratedEmail with subject, body, and reasoning.
    """
    import json

    user_prompt = _build_user_prompt(req, prospect)

    logger.info(f"Generating email for {prospect.name} at {prospect.company}")

    response = await client.aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            temperature=0.85,
            response_mime_type="application/json",
            system_instruction=SYSTEM_PROMPT,
        ),
    )

    content = response.text
    data = json.loads(content)

    return GeneratedEmail(
        subject=data["subject"],
        body=data["body"],
        reasoning=data.get("reasoning", ""),
        prospect_name=prospect.name,
        prospect_company=prospect.company,
        tone_used=req.tone,
        generated_at=datetime.utcnow(),
    )


async def regenerate_with_feedback(
    original_email: GeneratedEmail,
    feedback: str,
    req: GenerateEmailRequest,
    prospect: ProspectData,
) -> GeneratedEmail:
    """Regenerate an email incorporating user feedback."""
    import json

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=_build_user_prompt(req, prospect))]
        ),
        types.Content(
            role="model",
            parts=[types.Part.from_text(text=f'{{"subject": "{original_email.subject}", "body": "{original_email.body}", "reasoning": "{original_email.reasoning}"}}')]
        ),
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=f"Please rewrite the email with this feedback: {feedback}")]
        ),
    ]

    response = await client.aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            temperature=0.85,
            response_mime_type="application/json",
            system_instruction=SYSTEM_PROMPT,
        ),
    )

    data = json.loads(response.text)

    return GeneratedEmail(
        subject=data["subject"],
        body=data["body"],
        reasoning=data.get("reasoning", ""),
        prospect_name=prospect.name,
        prospect_company=prospect.company,
        tone_used=req.tone,
        generated_at=datetime.utcnow(),
    )

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# ── Auth ──────────────────────────────────────────────────────────────

@patch("app.api.auth.get_user_by_email", new_callable=AsyncMock)
@patch("app.api.auth.save_user", new_callable=AsyncMock)
def test_register_success(mock_save, mock_get):
    mock_get.return_value = None   # no existing user
    res = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "securepass123",
        "name": "Test User",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"


@patch("app.api.auth.get_user_by_email", new_callable=AsyncMock)
def test_register_duplicate_email(mock_get):
    mock_get.return_value = {"email": "test@example.com", "user_id": "123"}
    res = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "pass",
        "name": "Test",
    })
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"]


# ── Rate Limiting ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_quota_exceeded_returns_429():
    with patch("app.api.emails.check_and_increment_quota", new_callable=AsyncMock) as mock_quota:
        with patch("app.api.emails.get_user", new_callable=AsyncMock) as mock_user:
            mock_user.return_value = {"plan": "free"}
            mock_quota.return_value = {"allowed": False, "used": 5, "limit": 5}

            from app.core.security import create_access_token
            token = create_access_token("user123", "test@example.com")

            res = client.post(
                "/api/emails/generate",
                json={
                    "prospect": {"name": "John", "role": "CEO", "company": "Acme"},
                    "sender_name": "Jane",
                    "sender_company": "MyCompany",
                    "sender_value_prop": "We save time",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            assert res.status_code == 429
            assert "limit" in res.json()["detail"].lower()


# ── Scraper ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_scraper_domain_extraction():
    from app.services.scraper_service import ProspectScraper
    s = ProspectScraper()
    name = s._extract_domain_name("https://www.stripe.com/about")
    assert name == "Stripe"


# ── Email Service ─────────────────────────────────────────────────────

@pytest.mark.asyncio
@patch("app.services.email_service.client")
async def test_generate_email_returns_structured_output(mock_gemini):
    import json
    from app.services.email_service import generate_email
    from app.models.schemas import GenerateEmailRequest, ProspectInput, ProspectData

    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "reasoning": "They focus on developer tools so I led with time savings.",
        "subject": "Saving 3hrs/week for Stripe's engineering team",
        "body": "Hi John,\n\nNoticed Stripe is scaling fast...",
    })
    mock_gemini.aio.models.generate_content = AsyncMock(return_value=mock_response)

    req = GenerateEmailRequest(
        prospect=ProspectInput(name="John", role="VP Eng", company="Stripe"),
        sender_name="Jane", sender_company="Acme",
        sender_value_prop="We cut code review time by 50%",
    )
    prospect = ProspectData(name="John", role="VP Eng", company="Stripe", about="Leading payments company")

    result = await generate_email(req, prospect)
    assert result.subject == "Saving 3hrs/week for Stripe's engineering team"
    assert "John" in result.body or "Stripe" in result.body

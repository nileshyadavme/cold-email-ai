from fastapi import APIRouter, Depends, HTTPException, Request
from app.models.schemas import CheckoutRequest, CheckoutResponse
from app.core.security import get_current_user
from app.services.stripe_service import (
    create_checkout_session, handle_webhook, get_billing_portal_url
)
from app.services.redis_service import get_user

router = APIRouter()


@router.get("/me")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Return current user's profile and plan."""
    user = await get_user(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    from app.services.redis_service import _normalize_plan
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "plan": _normalize_plan(user.get("plan", "free")),
    }


@router.post("/billing/checkout", response_model=CheckoutResponse)
async def create_checkout(
    req: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a Stripe checkout session to upgrade plan."""
    user = await get_user(current_user["user_id"])
    url = await create_checkout_session(
        user_id=current_user["user_id"],
        email=current_user["email"],
        plan=req.plan,
        success_url=req.success_url,
        cancel_url=req.cancel_url,
    )
    return CheckoutResponse(checkout_url=url)


@router.post("/billing/portal")
async def billing_portal(
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """Redirect to Stripe billing portal for plan management."""
    user = await get_user(current_user["user_id"])
    customer_id = user.get("stripe_customer_id", "")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer found for this account")
    url = await get_billing_portal_url(customer_id, payload.get("return_url", "http://localhost:3000"))
    return {"portal_url": url}


@router.post("/billing/webhook")
async def stripe_webhook(request: Request):
    """Stripe webhook endpoint — handles subscription events."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    return await handle_webhook(payload, sig)

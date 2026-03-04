"""
Stripe Billing Service
Handles checkout session creation and webhook processing.
"""

import logging
import stripe
from fastapi import HTTPException
from app.core.config import settings
from app.services.redis_service import update_user_plan

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

PRICE_TO_PLAN = {
    settings.STRIPE_PRO_PRICE_ID: "pro",
    settings.STRIPE_BUSINESS_PRICE_ID: "business",
}


async def create_checkout_session(
    user_id: str,
    email: str,
    plan: str,
    success_url: str,
    cancel_url: str,
) -> str:
    """Create a Stripe Checkout session and return the URL."""
    price_id = (
        settings.STRIPE_PRO_PRICE_ID
        if plan == "pro"
        else settings.STRIPE_BUSINESS_PRICE_ID
    )

    if not price_id:
        raise HTTPException(
            status_code=500,
            detail="Stripe price IDs not configured. Add STRIPE_PRO_PRICE_ID to .env"
        )

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=email,
            line_items=[{"price": price_id, "quantity": 1}],
            billing_address_collection="required",
            metadata={"user_id": user_id, "plan": plan},
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
        )
        return session.url
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


async def handle_webhook(payload: bytes, sig_header: str):
    """
    Process Stripe webhook events.
    Upgrades user plan on successful subscription.
    """
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]
    logger.info(f"Stripe webhook received: {event_type}")

    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        plan = session["metadata"].get("plan", "pro")
        customer_id = session.get("customer", "")

        if user_id:
            await update_user_plan(user_id, plan, customer_id)
            logger.info(f"Upgraded user {user_id} to {plan}")

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        # Downgrade to free on cancellation
        session = event["data"]["object"]
        customer_id = session.get("customer")
        if customer_id:
            # In production: look up user by stripe_customer_id in DB
            logger.info(f"Subscription cancelled for customer {customer_id}")

    return {"status": "ok"}


async def get_billing_portal_url(stripe_customer_id: str, return_url: str) -> str:
    """Create a Stripe billing portal session for plan management."""
    session = stripe.billing_portal.Session.create(
        customer=stripe_customer_id,
        return_url=return_url,
    )
    return session.url

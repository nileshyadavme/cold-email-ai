import uuid
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import RegisterRequest, LoginRequest, AuthResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.services.redis_service import save_user, get_user_by_email

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    # Check duplicate email
    existing = await get_user_by_email(req.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user_id = str(uuid.uuid4())
    user = {
        "user_id": user_id,
        "email": req.email,
        "name": req.name,
        "password_hash": hash_password(req.password),
        "plan": "free",
        "stripe_customer_id": "",
    }

    await save_user(user_id, user)
    token = create_access_token(user_id, req.email)

    return AuthResponse(
        access_token=token,
        user={"user_id": user_id, "email": req.email, "name": req.name, "plan": "free"},
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    user = await get_user_by_email(req.email)

    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(user["user_id"], user["email"])

    return AuthResponse(
        access_token=token,
        user={
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "plan": user.get("plan", "free"),
        },
    )

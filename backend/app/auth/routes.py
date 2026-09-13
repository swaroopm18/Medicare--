from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime
from bson import ObjectId

from app.models.schemas import (
    RegisterRequest, LoginRequest, TokenResponse, UserOut, UpdatePreferences
)
from app.database import users_col
from app.utils.security import (
    hash_password, verify_password, create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_doc_to_out(doc) -> UserOut:
    return UserOut(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        member_since=doc["member_since"],
        dark_mode=doc.get("dark_mode", False),
        medicine_alarm_sound=doc.get("medicine_alarm_sound", True),
        push_notifications=doc.get("push_notifications", True),
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: RegisterRequest):
    existing = await users_col.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "member_since": datetime.now(),
        "dark_mode": False,
        "medicine_alarm_sound": True,
        "push_notifications": True,
    }
    result = await users_col.insert_one(doc)
    doc["_id"] = result.inserted_id

    token = create_access_token({"sub": str(doc["_id"])})
    return TokenResponse(access_token=token, user=_user_doc_to_out(doc))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    user = await users_col.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": str(user["_id"])})
    return TokenResponse(access_token=token, user=_user_doc_to_out(user))


@router.post("/login/oauth", response_model=TokenResponse, include_in_schema=False)
async def login_oauth_form(form_data: OAuth2PasswordRequestForm = Depends()):
    """Compatibility endpoint so Swagger's 'Authorize' button works out of the box."""
    return await login(LoginRequest(email=form_data.username, password=form_data.password))


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return _user_doc_to_out(current_user)


@router.patch("/me/preferences", response_model=UserOut)
async def update_preferences(
    payload: UpdatePreferences, current_user: dict = Depends(get_current_user)
):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if updates:
        await users_col.update_one({"_id": ObjectId(current_user["_id"])}, {"$set": updates})
    updated = await users_col.find_one({"_id": ObjectId(current_user["_id"])})
    return _user_doc_to_out(updated)


@router.post("/logout")
async def logout():
    # JWTs are stateless; logout is handled client-side by discarding the token.
    # If you need server-side invalidation, add a token-blacklist collection keyed by jti.
    return {"detail": "Logged out successfully."}

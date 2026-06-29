import base64
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.db import app_now, get_db
from database.models import GuestUsage, User, UserSession


router = APIRouter(prefix="/api/auth/oauth", tags=["Social OAuth"])
bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)

APP_JWT_SECRET = os.environ.get("APP_JWT_SECRET", "javaapex-super-secret-key-change-this")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("APP_JWT_EXPIRE_MINUTES", "1440"))
BACKEND_BASE_URL = os.environ.get("BACKEND_BASE_URL", "http://localhost:8001").rstrip("/")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
GUEST_MIGRATION_LIMIT = 3
GUEST_LIMIT_MESSAGE = (
    "You have used all 3 free guest migrations. "
    "Please login with GitHub, GitLab, or Google to continue migrating projects."
)


class OAuthUserResponse(BaseModel):
    id: Optional[int] = None
    subject: Optional[str] = Field(default=None, exclude=True)
    session_id: Optional[str] = Field(default=None, exclude=True)
    session_db_id: Optional[int] = Field(default=None, exclude=True)
    name: str
    email: Optional[str] = None
    provider: str
    role: str = "user"
    migration_limit: Optional[int] = None
    migrations_used: Optional[int] = None
    remaining_migrations: Optional[int] = None


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: OAuthUserResponse


def utc_now() -> datetime:
    return app_now()


def get_provider_config(provider: str) -> Dict[str, str]:
    configs = {
        "github": {
            "client_id": os.environ.get("GITHUB_OAUTH_CLIENT_ID", ""),
            "client_secret": os.environ.get("GITHUB_OAUTH_CLIENT_SECRET", ""),
            "auth_url": "https://github.com/login/oauth/authorize",
            "token_url": "https://github.com/login/oauth/access_token",
            "scope": "read:user user:email",
        },
        "gitlab": {
            "client_id": os.environ.get("GITLAB_OAUTH_CLIENT_ID", ""),
            "client_secret": os.environ.get("GITLAB_OAUTH_CLIENT_SECRET", ""),
            "auth_url": "https://gitlab.com/oauth/authorize",
            "token_url": "https://gitlab.com/oauth/token",
            "scope": "read_user openid email",
        },
        "google": {
            "client_id": os.environ.get("GOOGLE_OAUTH_CLIENT_ID", ""),
            "client_secret": os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", ""),
            "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "scope": "openid email profile",
        },
    }

    if provider not in configs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")

    config = configs[provider]
    if not config["client_id"] or not config["client_secret"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{provider.title()} OAuth credentials are not configured",
        )

    return config


def callback_url(provider: str) -> str:
    return f"{BACKEND_BASE_URL}/api/auth/oauth/{provider}/callback"


def encode_state(redirect_url: str) -> str:
    payload = {"redirect_url": redirect_url or FRONTEND_URL}
    raw = json.dumps(payload).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8")


def decode_state(state: str) -> str:
    try:
        padded = state + "=" * (-len(state) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8"))
        return payload.get("redirect_url") or FRONTEND_URL
    except Exception:
        return FRONTEND_URL


def create_user_session(db: Session, user: User, request: Optional[Request] = None) -> UserSession:
    now = utc_now()
    session = UserSession(
        user_id=user.id,
        session_id=str(uuid.uuid4()),
        provider=user.provider,
        role=user.role,
        login_time=now,
        last_active_time=now,
        session_status="active",
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
        created_at=now,
        updated_at=now,
    )
    user.last_login_at = now
    user.updated_at = now
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def user_to_response(user: User, session: Optional[UserSession] = None) -> OAuthUserResponse:
    migration_limit = None
    migrations_used = None
    remaining_migrations = None

    if user.role == "guest":
        usage = user.guest_usage
        migration_limit = usage.migration_limit if usage else GUEST_MIGRATION_LIMIT
        migrations_used = usage.migrations_used if usage else 0
        remaining_migrations = max(migration_limit - migrations_used, 0)

    return OAuthUserResponse(
        id=user.id,
        subject=str(user.id),
        session_id=session.session_id if session else None,
        session_db_id=session.id if session else None,
        name=user.name or "JavaAPEX User",
        email=user.email,
        provider=user.provider,
        role=user.role,
        migration_limit=migration_limit,
        migrations_used=migrations_used,
        remaining_migrations=remaining_migrations,
    )


def create_app_token(user: User, session: UserSession) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    usage = user.guest_usage if user.role == "guest" else None
    payload = {
        "sub": str(user.id),
        "session_id": session.session_id,
        "name": user.name,
        "email": user.email,
        "provider": user.provider,
        "role": user.role,
        "migration_limit": usage.migration_limit if usage else None,
        "exp": expires_at,
    }
    return jwt.encode(payload, APP_JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_app_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, APP_JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


def get_current_app_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    payload = decode_app_token(credentials.credentials)
    user_id = payload.get("sub")
    session_uuid = payload.get("session_id")

    user = db.get(User, int(user_id)) if user_id and str(user_id).isdigit() else None
    session = (
        db.query(UserSession)
        .filter(UserSession.session_id == session_uuid, UserSession.user_id == user.id)
        .first()
        if user and session_uuid
        else None
    )

    if not user or not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    if session.session_status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is logged out")

    session.last_active_time = utc_now()
    session.updated_at = utc_now()
    db.commit()

    return {
        "user_id": user.id,
        "session_db_id": session.id,
        "session_id": session.session_id,
        "name": user.name,
        "email": user.email,
        "provider": user.provider,
        "role": user.role,
    }


def get_optional_app_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[Dict[str, Any]]:
    if not credentials:
        return None
    return get_current_app_user(credentials, db)


def get_current_user(current_user: Dict[str, Any] = Depends(get_current_app_user), db: Session = Depends(get_db)) -> OAuthUserResponse:
    user = db.get(User, current_user["user_id"])
    session = db.get(UserSession, current_user["session_db_id"])
    return user_to_response(user, session)


def validate_guest_migration_limit(current_user: Dict[str, Any], db: Session) -> GuestUsage:
    if current_user["role"] != "guest":
        return None

    usage = db.query(GuestUsage).filter(GuestUsage.user_id == current_user["user_id"]).first()
    if not usage:
        usage = GuestUsage(user_id=current_user["user_id"], migrations_used=0, migration_limit=GUEST_MIGRATION_LIMIT)
        db.add(usage)
        db.commit()
        db.refresh(usage)

    if usage.migrations_used >= usage.migration_limit:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=GUEST_LIMIT_MESSAGE)
    return usage


def increment_guest_usage(current_user: Dict[str, Any], db: Session) -> GuestUsage:
    usage = validate_guest_migration_limit(current_user, db)
    if not usage:
        return None
    usage.migrations_used += 1
    usage.updated_at = utc_now()
    db.commit()
    db.refresh(usage)
    return usage


def upsert_user(db: Session, provider: str, profile: Dict[str, Any]) -> User:
    now = utc_now()
    provider_user_id = str(profile["provider_user_id"])
    user = (
        db.query(User)
        .filter(User.provider == provider, User.provider_user_id == provider_user_id)
        .first()
    )

    if not user:
        user = User(
            provider=provider,
            provider_user_id=provider_user_id,
            role="user",
            created_at=now,
        )
        db.add(user)

    user.name = profile.get("name") or profile.get("email") or "JavaAPEX User"
    user.email = profile.get("email") or None
    user.avatar_url = profile.get("avatar_url") or None
    user.updated_at = now
    user.last_login_at = now
    db.commit()
    db.refresh(user)
    return user


def redirect_with_token(frontend_url: str, token: str) -> RedirectResponse:
    separator = "&" if "?" in frontend_url else "?"
    return RedirectResponse(f"{frontend_url}{separator}oauth_token={token}")


async def exchange_code(provider: str, code: str) -> Dict[str, Any]:
    config = get_provider_config(provider)
    data = {
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "code": code,
        "redirect_uri": callback_url(provider),
        "grant_type": "authorization_code",
    }

    headers = {"Accept": "application/json"}
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(config["token_url"], data=data, headers=headers)
        response.raise_for_status()
        token_data = response.json()

    if not token_data.get("access_token"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth provider did not return an access token")

    return token_data


async def fetch_profile(provider: str, access_token: str) -> Dict[str, Any]:
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

    async with httpx.AsyncClient(timeout=20) as client:
        if provider == "github":
            user_response = await client.get("https://api.github.com/user", headers=headers)
            user_response.raise_for_status()
            user = user_response.json()

            email = user.get("email") or ""
            if not email:
                email_response = await client.get("https://api.github.com/user/emails", headers=headers)
                if email_response.status_code == 200:
                    emails = email_response.json()
                    primary = next((item for item in emails if item.get("primary")), None)
                    email = (primary or emails[0]).get("email", "") if emails else ""

            return {
                "provider_user_id": user.get("id"),
                "name": user.get("name") or user.get("login"),
                "email": email,
                "avatar_url": user.get("avatar_url"),
            }

        if provider == "gitlab":
            response = await client.get("https://gitlab.com/api/v4/user", headers=headers)
            response.raise_for_status()
            user = response.json()
            return {
                "provider_user_id": user.get("id"),
                "name": user.get("name") or user.get("username"),
                "email": user.get("email") or user.get("public_email") or "",
                "avatar_url": user.get("avatar_url"),
            }

        if provider == "google":
            response = await client.get("https://www.googleapis.com/oauth2/v2/userinfo", headers=headers)
            response.raise_for_status()
            user = response.json()
            return {
                "provider_user_id": user.get("id"),
                "name": user.get("name"),
                "email": user.get("email") or "",
                "avatar_url": user.get("picture"),
            }

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")


@router.post("/guest", response_model=AuthTokenResponse)
def guest_login(request: Request, db: Session = Depends(get_db)) -> AuthTokenResponse:
    guest_uuid = str(uuid.uuid4())
    now = utc_now()
    guest = User(
        provider="guest",
        provider_user_id=guest_uuid,
        name="Guest User",
        email=f"guest_{guest_uuid}@javaapex.local",
        role="guest",
        created_at=now,
        updated_at=now,
        last_login_at=now,
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)

    usage = GuestUsage(user_id=guest.id, migrations_used=0, migration_limit=GUEST_MIGRATION_LIMIT)
    db.add(usage)
    db.commit()
    db.refresh(guest)

    session = create_user_session(db, guest, request)
    token = create_app_token(guest, session)
    return AuthTokenResponse(access_token=token, user=user_to_response(guest, session))


async def oauth_login_for_provider(provider: str, redirect_url: str = "") -> RedirectResponse:
    config = get_provider_config(provider)
    params = {
        "client_id": config["client_id"],
        "redirect_uri": callback_url(provider),
        "scope": config["scope"],
        "state": encode_state(redirect_url or FRONTEND_URL),
        "response_type": "code",
    }

    if provider == "google":
        params["access_type"] = "online"
        params["prompt"] = "select_account"

    return RedirectResponse(f"{config['auth_url']}?{urlencode(params)}")


async def oauth_callback_for_provider(
    provider: str,
    code: str,
    request: Request,
    db: Session,
    state: str = "",
) -> RedirectResponse:
    frontend_redirect_url = decode_state(state)
    token_data = await exchange_code(provider, code)
    profile = await fetch_profile(provider, token_data["access_token"])
    user = upsert_user(db, provider, profile)
    session = create_user_session(db, user, request)
    app_token = create_app_token(user, session)
    return redirect_with_token(frontend_redirect_url, app_token)


@router.get("/github/login")
async def github_oauth_login(redirect_url: str = Query(default="")) -> RedirectResponse:
    return await oauth_login_for_provider("github", redirect_url)


@router.get("/github/callback")
async def github_oauth_callback(code: str, request: Request, state: str = "", db: Session = Depends(get_db)) -> RedirectResponse:
    return await oauth_callback_for_provider("github", code, request, db, state)


@router.get("/gitlab/login")
async def gitlab_oauth_login(redirect_url: str = Query(default="")) -> RedirectResponse:
    return await oauth_login_for_provider("gitlab", redirect_url)


@router.get("/gitlab/callback")
async def gitlab_oauth_callback(code: str, request: Request, state: str = "", db: Session = Depends(get_db)) -> RedirectResponse:
    return await oauth_callback_for_provider("gitlab", code, request, db, state)


@router.get("/google/login")
async def google_oauth_login(redirect_url: str = Query(default="")) -> RedirectResponse:
    return await oauth_login_for_provider("google", redirect_url)


@router.get("/google/callback")
async def google_oauth_callback(code: str, request: Request, state: str = "", db: Session = Depends(get_db)) -> RedirectResponse:
    return await oauth_callback_for_provider("google", code, request, db, state)


@router.get("/me", response_model=OAuthUserResponse)
def oauth_me(current_user: Dict[str, Any] = Depends(get_current_app_user), db: Session = Depends(get_db)) -> OAuthUserResponse:
    user = db.get(User, current_user["user_id"])
    session = db.get(UserSession, current_user["session_db_id"])
    return user_to_response(user, session)


@router.post("/logout")
def oauth_logout(current_user: Dict[str, Any] = Depends(get_current_app_user), db: Session = Depends(get_db)):
    now = utc_now()
    session = db.get(UserSession, current_user["session_db_id"])
    user = db.get(User, current_user["user_id"])

    session.logout_time = now
    session.session_status = "logged_out"
    session.updated_at = now
    user.last_logout_at = now
    user.updated_at = now
    db.commit()
    return {"message": "Logged out successfully"}


@router.get("/sessions")
def list_current_user_sessions(current_user: Dict[str, Any] = Depends(get_current_app_user), db: Session = Depends(get_db)):
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == current_user["user_id"])
        .order_by(UserSession.login_time.desc())
        .all()
    )
    return [
        {
            "id": session.id,
            "session_id": session.session_id,
            "provider": session.provider,
            "role": session.role,
            "login_time": session.login_time,
            "logout_time": session.logout_time,
            "last_active_time": session.last_active_time,
            "session_status": session.session_status,
        }
        for session in sessions
    ]

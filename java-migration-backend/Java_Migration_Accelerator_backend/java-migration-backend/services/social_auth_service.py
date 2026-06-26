import base64
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/auth/oauth", tags=["Social OAuth"])
bearer_scheme = HTTPBearer()

APP_JWT_SECRET = os.environ.get("APP_JWT_SECRET", "javaapex-development-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("APP_JWT_EXPIRE_MINUTES", "1440"))
BACKEND_BASE_URL = os.environ.get("BACKEND_BASE_URL", "http://localhost:8001").rstrip("/")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
DATA_DIR = Path(__file__).resolve().parents[1] / "data"
OAUTH_USERS_FILE = DATA_DIR / "oauth_users.json"
GUEST_USAGE_FILE = DATA_DIR / "guest_usage.json"
GUEST_MIGRATION_LIMIT = 3
GUEST_LIMIT_MESSAGE = (
    "You have used all 3 free guest migrations. "
    "Please login with GitHub, GitLab, or Google to continue migrating projects."
)


class OAuthUserResponse(BaseModel):
    subject: Optional[str] = Field(default=None, exclude=True)
    name: str
    email: str
    provider: str
    role: str = "user"
    migration_limit: Optional[int] = None
    migrations_used: Optional[int] = None
    remaining_migrations: Optional[int] = None


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: OAuthUserResponse


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


def load_json_file(path: Path) -> Dict[str, Dict[str, Any]]:
    if not path.exists():
        return {}

    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
            return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def save_json_file(path: Path, data: Dict[str, Dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = path.with_suffix(".tmp")
    with temp_file.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)
    temp_file.replace(path)


def load_users() -> Dict[str, Dict[str, Any]]:
    return load_json_file(OAUTH_USERS_FILE)


def save_users(users: Dict[str, Dict[str, Any]]) -> None:
    save_json_file(OAUTH_USERS_FILE, users)


def load_guest_usage() -> Dict[str, Dict[str, Any]]:
    return load_json_file(GUEST_USAGE_FILE)


def save_guest_usage(usage: Dict[str, Dict[str, Any]]) -> None:
    save_json_file(GUEST_USAGE_FILE, usage)


def get_guest_usage(guest_session_id: str) -> Dict[str, Any]:
    usage = load_guest_usage()
    now = datetime.now(timezone.utc).isoformat()
    existing = usage.get(guest_session_id)

    if existing:
        migrations_used = int(existing.get("migrations_used", 0))
        migration_limit = int(existing.get("migration_limit", GUEST_MIGRATION_LIMIT))
        return {
            "migrations_used": migrations_used,
            "migration_limit": migration_limit,
            "created_at": existing.get("created_at", now),
            "updated_at": existing.get("updated_at", now),
        }

    entry = {
        "migrations_used": 0,
        "migration_limit": GUEST_MIGRATION_LIMIT,
        "created_at": now,
        "updated_at": now,
    }
    usage[guest_session_id] = entry
    save_guest_usage(usage)
    return entry


def increment_guest_usage(guest_session_id: str) -> Dict[str, Any]:
    usage = load_guest_usage()
    current = get_guest_usage(guest_session_id)
    now = datetime.now(timezone.utc).isoformat()
    updated = {
        **current,
        "migrations_used": int(current.get("migrations_used", 0)) + 1,
        "updated_at": now,
    }
    usage[guest_session_id] = updated
    save_guest_usage(usage)
    return updated


def validate_guest_migration_limit(current_user: "OAuthUserResponse") -> None:
    if current_user.role != "guest":
        return

    if not current_user.subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid guest session")

    usage = get_guest_usage(current_user.subject)
    migrations_used = int(usage.get("migrations_used", 0))
    migration_limit = int(usage.get("migration_limit", GUEST_MIGRATION_LIMIT))

    if migrations_used >= migration_limit:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=GUEST_LIMIT_MESSAGE)


def upsert_user(provider: str, profile: Dict[str, Any]) -> Dict[str, Any]:
    users = load_users()
    now = datetime.now(timezone.utc).isoformat()
    provider_user_id = str(profile["provider_user_id"])
    key = f"{provider}:{provider_user_id}"

    existing = users.get(key, {})
    user = {
        "provider": provider,
        "provider_user_id": provider_user_id,
        "name": profile.get("name") or profile.get("email") or "JavaAPEX User",
        "email": profile.get("email") or "",
        "avatar_url": profile.get("avatar_url") or "",
        "created_at": existing.get("created_at", now),
        "updated_at": now,
    }

    users[key] = user
    save_users(users)
    return user


def create_app_token(user: Dict[str, Any]) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    role = user.get("role") or "user"
    subject = user["provider_user_id"] if role == "guest" else (user.get("email") or f"{user['provider']}:{user['provider_user_id']}")
    payload = {
        "sub": subject,
        "name": user["name"],
        "email": user["email"],
        "provider": user["provider"],
        "role": role,
        "migration_limit": user.get("migration_limit") if role == "guest" else None,
        "exp": expires_at,
    }
    return jwt.encode(payload, APP_JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_guest_session() -> Dict[str, Any]:
    return {
        "provider": "guest",
        "provider_user_id": str(uuid.uuid4()),
        "name": "Guest User",
        "email": "guest@javaapex.local",
        "role": "guest",
        "migration_limit": GUEST_MIGRATION_LIMIT,
    }


def user_response_from_payload(payload: Dict[str, Any]) -> OAuthUserResponse:
    role = payload.get("role") or "user"
    subject = payload.get("sub") or ""
    migration_limit = payload.get("migration_limit") if role == "guest" else None
    migrations_used = None
    remaining_migrations = None

    if role == "guest" and subject:
        usage = get_guest_usage(subject)
        migration_limit = int(usage.get("migration_limit", migration_limit or GUEST_MIGRATION_LIMIT))
        migrations_used = int(usage.get("migrations_used", 0))
        remaining_migrations = max(migration_limit - migrations_used, 0)

    return OAuthUserResponse(
        subject=subject,
        name=payload.get("name") or "JavaAPEX User",
        email=payload.get("email") or "",
        provider=payload.get("provider") or "unknown",
        role=role,
        migration_limit=migration_limit,
        migrations_used=migrations_used,
        remaining_migrations=remaining_migrations,
    )


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

    access_token = token_data.get("access_token")
    if not access_token:
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


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> OAuthUserResponse:
    try:
        payload = jwt.decode(credentials.credentials, APP_JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    return user_response_from_payload(payload)


@router.post("/guest", response_model=AuthTokenResponse)
def guest_login() -> AuthTokenResponse:
    guest = create_guest_session()
    get_guest_usage(guest["provider_user_id"])
    token = create_app_token(guest)
    return AuthTokenResponse(
        access_token=token,
        user=OAuthUserResponse(
            subject=guest["provider_user_id"],
            name=guest["name"],
            email=guest["email"],
            provider=guest["provider"],
            role=guest["role"],
            migration_limit=guest["migration_limit"],
            migrations_used=0,
            remaining_migrations=guest["migration_limit"],
        ),
    )


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


async def oauth_callback_for_provider(provider: str, code: str, state: str = "") -> RedirectResponse:
    frontend_redirect_url = decode_state(state)
    token_data = await exchange_code(provider, code)
    profile = await fetch_profile(provider, token_data["access_token"])
    user = upsert_user(provider, profile)
    app_token = create_app_token(user)
    return redirect_with_token(frontend_redirect_url, app_token)


@router.get("/github/login")
async def github_oauth_login(redirect_url: str = Query(default="")) -> RedirectResponse:
    return await oauth_login_for_provider("github", redirect_url)


@router.get("/github/callback")
async def github_oauth_callback(code: str, state: str = "") -> RedirectResponse:
    return await oauth_callback_for_provider("github", code, state)


@router.get("/gitlab/login")
async def gitlab_oauth_login(redirect_url: str = Query(default="")) -> RedirectResponse:
    return await oauth_login_for_provider("gitlab", redirect_url)


@router.get("/gitlab/callback")
async def gitlab_oauth_callback(code: str, state: str = "") -> RedirectResponse:
    return await oauth_callback_for_provider("gitlab", code, state)


@router.get("/google/login")
async def google_oauth_login(redirect_url: str = Query(default="")) -> RedirectResponse:
    return await oauth_login_for_provider("google", redirect_url)


@router.get("/google/callback")
async def google_oauth_callback(code: str, state: str = "") -> RedirectResponse:
    return await oauth_callback_for_provider("google", code, state)


@router.get("/me", response_model=OAuthUserResponse)
def oauth_me(current_user: OAuthUserResponse = Depends(get_current_user)) -> OAuthUserResponse:
    return current_user

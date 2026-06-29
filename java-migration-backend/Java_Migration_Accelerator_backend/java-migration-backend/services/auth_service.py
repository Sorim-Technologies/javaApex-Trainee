import os
from urllib.parse import urlencode, urlsplit

import requests
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

router = APIRouter()

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "Ov23livUCegqUQNlmOgt")
GITHUB_CLIENT_SECRET = os.environ.get(
    "GITHUB_CLIENT_SECRET",
    "1c9570628d5ef5a79837d2eb27f648489d003ed3",
)
GITHUB_REDIRECT_URI = os.environ.get("GITHUB_REDIRECT_URI", "").strip()

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "").strip()

print(f"[AUTH_SERVICE] GITHUB_REDIRECT_URI override: {GITHUB_REDIRECT_URI or '[auto]'}")
print(f"[AUTH_SERVICE] GOOGLE_REDIRECT_URI override: {GOOGLE_REDIRECT_URI or '[auto]'}")


def frontend_origin_from_request(request: Request) -> str:
    origin = (request.headers.get("origin") or "").strip()
    if origin:
        return origin.rstrip("/")

    referer = (request.headers.get("referer") or "").strip()
    if referer:
        parsed = urlsplit(referer)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")

    host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.netloc
    )
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme

    if host in {"127.0.0.1:8000", "localhost:8000"}:
        return "http://localhost:5175"

    if host:
        return f"{proto}://{host}".rstrip("/")

    return "http://localhost:5175"


def resolve_redirect_uri(request: Request, provider: str) -> str:
    if provider == "github" and GITHUB_REDIRECT_URI:
        return GITHUB_REDIRECT_URI
    if provider == "google" and GOOGLE_REDIRECT_URI:
        return GOOGLE_REDIRECT_URI

    frontend_origin = frontend_origin_from_request(request)
    callback_path = "/auth/google/callback" if provider == "google" else "/auth/callback"
    return f"{frontend_origin}{callback_path}"


@router.get("/auth/google/status")
def google_status():
    return {
        "configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
    }


@router.get("/auth/github/login")
def github_login(request: Request):
    redirect_uri = resolve_redirect_uri(request, "github")
    print(f"[AUTH_SERVICE] /auth/github/login using redirect_uri: {redirect_uri}")
    github_auth_url = "https://github.com/login/oauth/authorize?" + urlencode(
        {
            "client_id": GITHUB_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": "repo,user",
        }
    )
    return RedirectResponse(github_auth_url)


@router.get("/auth/github/callback")
def github_callback(code: str, request: Request):
    redirect_uri = resolve_redirect_uri(request, "github")
    token_resp = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
        },
        timeout=30,
    )
    token_json = token_resp.json()
    access_token = token_json.get("access_token")
    if not access_token:
        return JSONResponse(
            {
                "error": token_json.get("error_description")
                or token_json.get("error")
                or "Failed to get access token"
            },
            status_code=400,
        )

    user_resp = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"token {access_token}"},
        timeout=30,
    )
    user_info = user_resp.json()
    return {"access_token": access_token, "user": user_info}


@router.get("/auth/google/login")
def google_login(request: Request):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return JSONResponse(
            {
                "error": "Google login is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
            },
            status_code=503,
        )

    redirect_uri = resolve_redirect_uri(request, "google")
    print(f"[AUTH_SERVICE] /auth/google/login using redirect_uri: {redirect_uri}")
    google_auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(
        {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
        }
    )
    return RedirectResponse(google_auth_url)


@router.get("/auth/google/callback")
def google_callback(code: str, request: Request):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return JSONResponse(
            {
                "error": "Google login is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
            },
            status_code=503,
        )

    redirect_uri = resolve_redirect_uri(request, "google")
    token_resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        },
        timeout=30,
    )
    token_json = token_resp.json()
    access_token = token_json.get("access_token")
    if not access_token:
        return JSONResponse(
            {
                "error": token_json.get("error_description")
                or token_json.get("error")
                or "Failed to get Google access token"
            },
            status_code=400,
        )

    user_resp = requests.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    user_info = user_resp.json()
    email = user_info.get("email", "")
    if email and not user_info.get("login"):
        user_info["login"] = email.split("@", 1)[0]
    user_info.setdefault("html_url", "https://myaccount.google.com")
    return {"access_token": access_token, "user": user_info}

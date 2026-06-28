from datetime import datetime, timedelta, timezone
import time
import bcrypt
import httpx
from jose import JWTError, jwt, jwk
from jose.utils import base64url_decode
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

_jwks_cache = {"keys": None, "timestamp": 0}


def _get_jwks():
    settings = get_settings()
    if time.time() - _jwks_cache["timestamp"] < 3600 and _jwks_cache["keys"]:
        return _jwks_cache["keys"]
    try:
        resp = httpx.get(settings.NEON_AUTH_JWKS_URL, timeout=10)
        jwks = resp.json()
        _jwks_cache["keys"] = jwks.get("keys", [])
        _jwks_cache["timestamp"] = time.time()
    except Exception:
        pass
    return _jwks_cache["keys"] or []


def verify_neon_token(token: str) -> dict:
    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")
    keys = _get_jwks()
    key_data = None
    for k in keys:
        if k.get("kid") == kid:
            key_data = k
            break
    if not key_data:
        raise HTTPException(status_code=401, detail="Invalid token: key not found")
    public_key = jwk.construct(key_data)
    message, encoded_sig = token.rsplit(".", 1)
    decoded_sig = base64url_decode(encoded_sig.encode("utf-8"))
    if not public_key.verify(message.encode("utf-8"), decoded_sig):
        raise HTTPException(status_code=401, detail="Invalid token signature")
    claims = jwt.get_unverified_claims(token)
    return claims


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=get_settings().ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode, get_settings().SECRET_KEY, algorithm=get_settings().ALGORITHM
    )


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=get_settings().REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode, get_settings().SECRET_KEY, algorithm=get_settings().ALGORITHM
    )


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        claims = verify_neon_token(token)
        sub = claims.get("sub")
        email = claims.get("email", "")
        user = db.query(User).filter(User.neon_auth_id == sub).first()
        if not user and email:
            user = db.query(User).filter(User.email == email).first()
            if user:
                user.neon_auth_id = sub
                db.commit()
        if user and user.is_active:
            return user
    except Exception:
        pass
    try:
        payload = jwt.decode(
            token,
            get_settings().SECRET_KEY,
            algorithms=[get_settings().ALGORITHM],
        )
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        user_id = int(sub)
    except Exception:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

import bcrypt
import jwt as pyjwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from jwt import PyJWKClient
from sqlalchemy.orm import Session

from database import get_db
from models import User

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "default-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "72"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://icbjumixbmdjcrthfgas.supabase.co")

_jwks_client = PyJWKClient(
    f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
    cache_keys=True,
)

security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> Tuple[dict, str]:
    """Returns (payload, source) where source is 'legacy' or 'supabase'."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload, "legacy"
    except JWTError:
        pass

    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
        return payload, "supabase"
    except pyjwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌已过期或无效",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌已过期或无效",
        )


def _nickname_from_supabase_payload(payload: dict) -> Optional[str]:
    um = payload.get("user_metadata")
    if isinstance(um, dict):
        n = um.get("nickname")
        if isinstance(n, str) and n.strip():
            return n[:50]
    return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload, source = _decode_token(token)
    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的令牌")

    user = db.query(User).filter(User.id == user_id).first()
    if user is not None:
        return user

    if source == "legacy":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在")

    email = payload.get("email")
    if not email or not isinstance(email, str):
        email = f"{user_id}@supabase.local"

    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该邮箱已绑定其他账号",
        )

    user = User(
        id=user_id,
        email=email,
        password_hash=hash_password(secrets.token_hex(32)),
        nickname=_nickname_from_supabase_payload(payload),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# app/auth.py
import os
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt
from passlib.context import CryptContext

# ==== Config ====
JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE_ME_SUPER_SECRET")
JWT_ALG = "HS256"
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MIN", "60"))

ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASS = os.getenv("ADMIN_PASS", "mtcolectivo123")  # máx. 72 no aplica a pbkdf2, pero mantenlo razonable

# Usamos pbkdf2_sha256 para evitar problemas de bcrypt en Docker
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Si viene un hash ya calculado por env, úsalo. Si no, hachea ADMIN_PASS al arrancar.
ADMIN_PASS_HASH = os.getenv("ADMIN_PASS_HASH")
if not ADMIN_PASS_HASH:
    ADMIN_PASS_HASH = pwd_context.hash(ADMIN_PASS)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def authenticate(username: str, password: str) -> bool:
    if username != ADMIN_USER:
        return False
    return verify_password(password, ADMIN_PASS_HASH)


def create_token(sub: str) -> str:
    now = datetime.utcnow()
    payload = {
        "sub": sub,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXPIRE_MIN)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None
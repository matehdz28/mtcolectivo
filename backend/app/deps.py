from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from app.auth import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    Devuelve el 'sub' del token si es válido; lanza 401 si no lo es.
    """
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    return payload["sub"]
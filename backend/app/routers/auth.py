from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.auth import authenticate as authenticate_user, create_token as create_access_token
from app.deps import get_current_user  # opcional para /me

router = APIRouter(prefix="/auth", tags=["Auth"])

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MeResponse(BaseModel):
    username: str

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Recibe credenciales via x-www-form-urlencoded:
      username=...&password=...
    Devuelve un JWT si son correctas.
    """
    if not authenticate_user(form_data.username, form_data.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    token = create_access_token(form_data.username)
    return TokenResponse(access_token=token)

@router.get("/me", response_model=MeResponse)
def me(user: str = Depends(get_current_user)):
    return MeResponse(username=user)
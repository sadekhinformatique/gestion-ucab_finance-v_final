from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, AuditLog
from app.auth import (
    verify_password, hash_password, create_access_token,
    create_refresh_token, get_current_user
)
from app.config import get_settings
from app.schemas import (
    LoginRequest, Token, ChangePassword, ApiResponse
)

router = APIRouter(prefix="/api/auth", tags=["Authentification"])


@router.post("/login", response_model=Token)
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    settings = get_settings()
    try:
        neon_resp = httpx.post(
            f"{settings.NEON_AUTH_URL}/auth/sign-in/email",
            json={"email": request.username, "password": request.password},
            timeout=15,
        )
        if neon_resp.status_code == 200:
            neon_data = neon_resp.json()
            session_data = neon_data.get("session") or neon_data.get("data", {}).get("session", {})
            access_token = neon_data.get("access_token") or session_data.get("access_token")
            refresh_token = neon_data.get("refresh_token", "") or session_data.get("refresh_token", "")
            neon_user = neon_data.get("user") or neon_data.get("data", {}).get("user", {})
            email = neon_user.get("email", request.username)
            neon_auth_id = neon_user.get("id", "")

            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = db.query(User).filter(User.username == request.username).first()
            if user:
                user.neon_auth_id = neon_auth_id
                user.last_login = datetime.now()
                user.login_attempts = 0
                user.locked_until = None
                db.commit()
            else:
                user = User(
                    username=email.split("@")[0],
                    password_hash=hash_password(request.password),
                    first_name=neon_user.get("first_name", ""),
                    last_name=neon_user.get("last_name", ""),
                    email=email,
                    neon_auth_id=neon_auth_id,
                    role="Membre",
                    last_login=datetime.now(),
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            log = AuditLog(
                action="Connexion",
                user_id=user.id,
                details=f"Connexion via Neon Auth de l'utilisateur {user.username}",
                ip_address=req.client.host if req.client else None,
            )
            db.add(log)
            db.commit()

            return Token(
                access_token=access_token,
                refresh_token=refresh_token,
                user_id=user.id,
                role=user.role,
            )
    except httpx.RequestError:
        pass
    except Exception:
        pass

    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe incorrect",
        )
    if user.locked_until and user.locked_until > datetime.now():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Compte temporairement verrouillé. Réessayez plus tard.",
        )
    if not verify_password(request.password, user.password_hash):
        user.login_attempts += 1
        if user.login_attempts >= 5:
            user.locked_until = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe incorrect",
        )
    user.login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now()
    db.commit()

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    log = AuditLog(
        action="Connexion",
        user_id=user.id,
        details=f"Connexion de l'utilisateur {user.username}",
        ip_address=req.client.host if req.client else None,
    )
    db.add(log)
    db.commit()

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        role=user.role,
    )


@router.post("/refresh", response_model=Token)
def refresh_token(request: LoginRequest, db: Session = Depends(get_db)):
    from jose import JWTError, jwt
    from app.config import get_settings
    try:
        payload = jwt.decode(
            request.password,
            get_settings().SECRET_KEY,
            algorithms=[get_settings().ALGORITHM],
        )
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalide",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur invalide",
        )
    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return Token(access_token=access_token, refresh_token=refresh_token, user_id=user.id, role=user.role)


@router.post("/change-password", response_model=ApiResponse)
def change_password(
    data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ancien mot de passe incorrect",
        )
    current_user.password_hash = hash_password(data.new_password)
    db.commit()

    log = AuditLog(
        action="Changement mot de passe",
        user_id=current_user.id,
        details="Changement de mot de passe effectué",
    )
    db.add(log)
    db.commit()

    return ApiResponse(message="Mot de passe changé avec succès")


@router.post("/reset-password/{user_id}", response_model=ApiResponse)
def reset_password(
    user_id: int,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ["Président", "Vice-président"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission refusée",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé",
        )
    user.password_hash = hash_password(new_password)
    user.login_attempts = 0
    user.locked_until = None
    db.commit()

    log = AuditLog(
        action="Réinitialisation mot de passe",
        user_id=current_user.id,
        details=f"Mot de passe réinitialisé pour l'utilisateur {user.username}",
    )
    db.add(log)
    db.commit()

    return ApiResponse(message="Mot de passe réinitialisé avec succès")

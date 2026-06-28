import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import User, UserPermission, AuditLog
from app.auth import hash_password, get_current_user
from app.schemas import UserCreate, UserUpdate, UserResponse, ApiResponse
from app.ws_manager import get_ws_manager

router = APIRouter(prefix="/api/users", tags=["Utilisateurs"])


def _log_audit(db: Session, user_id: int, action: str, reference: str, details: str, req: Request = None):
    log = AuditLog(
        action=action,
        user_id=user_id,
        reference=reference,
        details=details,
        ip_address=req.client.host if req and req.client else None,
    )
    db.add(log)
    db.commit()


@router.get("")
def list_users(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    users = db.query(User).options(joinedload(User.permissions)).all()
    return [UserResponse.model_validate(u).model_dump() for u in users]


@router.get("/roles")
def list_roles(current_user=Depends(get_current_user)):
    return ["Président", "Vice-président", "Secrétaire", "Trésorier", "Membre"]


@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user = db.query(User).options(joinedload(User.permissions)).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return UserResponse.model_validate(user).model_dump()


@router.post("")
def create_user(
    data: UserCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = db.query(User).filter(
        (User.username == data.username) | (User.email == data.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nom d'utilisateur ou email déjà utilisé")
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        role=data.role,
    )
    db.add(user)
    db.flush()
    if data.permissions:
        for p in data.permissions:
            db.add(UserPermission(user_id=user.id, resource=p.get("resource"), permission=p.get("permission")))
    db.commit()
    db.refresh(user)
    _log_audit(db, current_user.id, "Création utilisateur", user.username, f"Utilisateur {user.username} créé avec rôle {user.role}", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return UserResponse.model_validate(user).model_dump()


@router.put("/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(User).options(joinedload(User.permissions)).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    for field in ["first_name", "last_name", "email", "phone", "role", "is_active"]:
        value = getattr(data, field, None)
        if value is not None:
            setattr(user, field, value)
    if data.permissions is not None:
        db.query(UserPermission).filter(UserPermission.user_id == user.id).delete()
        for p in data.permissions:
            db.add(UserPermission(user_id=user.id, resource=p.get("resource"), permission=p.get("permission")))
    db.commit()
    db.refresh(user)
    _log_audit(db, current_user.id, "Modification utilisateur", user.username, f"Utilisateur {user.username} modifié", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return UserResponse.model_validate(user).model_dump()


@router.put("/{user_id}/toggle-active", response_model=ApiResponse)
def toggle_active(
    user_id: int,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas désactiver votre propre compte")
    user.is_active = not user.is_active
    db.commit()
    status_text = "activé" if user.is_active else "désactivé"
    _log_audit(db, current_user.id, "Statut utilisateur", user.username, f"Utilisateur {user.username} {status_text}", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return ApiResponse(message=f"Utilisateur {status_text} avec succès")

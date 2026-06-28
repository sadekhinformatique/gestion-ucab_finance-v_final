import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Category, AuditLog
from app.auth import get_current_user
from app.schemas import CategoryCreate, CategoryUpdate, CategoryResponse, ApiResponse
from app.ws_manager import get_ws_manager

router = APIRouter(prefix="/api/categories", tags=["Catégories"])


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
def list_categories(
    type: str = "",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Category).filter(Category.is_active == True)
    if type:
        query = query.filter(Category.type == type.upper())
    cats = query.order_by(Category.type, Category.name).all()
    return [CategoryResponse.model_validate(c).model_dump() for c in cats]


@router.post("")
def create_category(
    data: CategoryCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    existing = db.query(Category).filter(
        Category.name == data.name, Category.type == data.type.upper()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cette catégorie existe déjà")
    cat = Category(
        name=data.name,
        type=data.type.upper(),
        description=data.description,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    _log_audit(db, current_user.id, "Création catégorie", cat.name, f"Catégorie {cat.name} ({cat.type}) créée", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return CategoryResponse.model_validate(cat).model_dump()


@router.put("/{category_id}")
def update_category(
    category_id: int,
    data: CategoryUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    _log_audit(db, current_user.id, "Modification catégorie", cat.name, f"Catégorie {cat.name} modifiée", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return CategoryResponse.model_validate(cat).model_dump()


@router.delete("/{category_id}", response_model=ApiResponse)
def delete_category(
    category_id: int,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    cat.is_active = False
    db.commit()
    _log_audit(db, current_user.id, "Suppression catégorie", cat.name, f"Catégorie {cat.name} désactivée", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return ApiResponse(message="Catégorie supprimée avec succès")

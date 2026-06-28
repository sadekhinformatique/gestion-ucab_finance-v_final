import json
import asyncio
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from app.database import get_db
from app.models import Income, AuditLog, Category
from app.auth import get_current_user
from app.schemas import IncomeCreate, IncomeUpdate, IncomeResponse, ApiResponse
from app.ws_manager import get_ws_manager

router = APIRouter(prefix="/api/incomes", tags=["Entrées"])


def _generate_number(db: Session) -> str:
    last = db.query(func.max(Income.number)).scalar()
    if last and last.startswith("IN-"):
        num = int(last.split("-")[1]) + 1
    else:
        num = 1
    return f"IN-{num:04d}"


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
def list_incomes(
    search: str = "",
    category_id: int = None,
    status: str = "",
    date_from: str = "",
    date_to: str = "",
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Income).options(joinedload(Income.category), joinedload(Income.user))
    if search:
        like = f"%{search}%"
        query = query.filter(Income.description.ilike(like) | Income.number.ilike(like))
    if category_id:
        query = query.filter(Income.category_id == category_id)
    if status:
        query = query.filter(Income.status == status)
    if date_from:
        query = query.filter(Income.date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(Income.date <= date.fromisoformat(date_to))
    total = query.count()
    items = query.order_by(Income.date.desc()).offset(skip).limit(limit).all()
    result = []
    for i in items:
        d = IncomeResponse.model_validate(i).model_dump()
        d["category_name"] = i.category.name if i.category else None
        d["user_name"] = f"{i.user.first_name} {i.user.last_name}" if i.user else None
        result.append(d)
    return {"total": total, "items": result}


@router.get("/total")
def total_income(
    year: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(Income.status == "Approuvé")
    if year:
        query = query.filter(extract("year", Income.date) == year)
    total = query.scalar()
    return {"total": float(total)}


@router.get("/monthly")
def monthly_income(
    year: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not year:
        year = date.today().year
    rows = (
        db.query(
            extract("month", Income.date).label("month"),
            func.coalesce(func.sum(Income.amount), 0).label("total"),
        )
        .filter(extract("year", Income.date) == year, Income.status == "Approuvé")
        .group_by("month")
        .order_by("month")
        .all()
    )
    return [{"month": int(r[0]), "total": float(r[1])} for r in rows]


@router.get("/category-breakdown")
def category_breakdown(
    year: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not year:
        year = date.today().year
    rows = (
        db.query(
            Category.name,
            func.coalesce(func.sum(Income.amount), 0).label("total"),
            func.count(Income.id).label("count"),
        )
        .join(Income, Income.category_id == Category.id)
        .filter(extract("year", Income.date) == year, Income.status == "Approuvé")
        .group_by(Category.name)
        .all()
    )
    return [{"category": r[0], "total": float(r[1]), "count": r[2]} for r in rows]


@router.get("/{income_id}")
def get_income(income_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    income = db.query(Income).options(joinedload(Income.category), joinedload(Income.user)).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    d = IncomeResponse.model_validate(income).model_dump()
    d["category_name"] = income.category.name if income.category else None
    d["user_name"] = f"{income.user.first_name} {income.user.last_name}" if income.user else None
    return d


@router.post("")
def create_income(
    data: IncomeCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    income = Income(
        number=_generate_number(db),
        date=data.date,
        category_id=data.category_id,
        description=data.description,
        amount=data.amount,
        source=data.source,
        receipt_reference=data.receipt_reference,
        status=data.status,
        user_id=data.user_id or current_user.id,
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    _log_audit(db, current_user.id, "Création entrée", income.number, f"Entrée {income.number} de {income.amount} FCFA créée", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    d = IncomeResponse.model_validate(income).model_dump()
    cat = db.query(Category).filter(Category.id == income.category_id).first()
    d["category_name"] = cat.name if cat else None
    d["user_name"] = f"{current_user.first_name} {current_user.last_name}"
    return d


@router.put("/{income_id}")
def update_income(
    income_id: int,
    data: IncomeUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(income, field, value)
    db.commit()
    db.refresh(income)
    _log_audit(db, current_user.id, "Modification entrée", income.number, f"Entrée {income.number} modifiée", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    d = IncomeResponse.model_validate(income).model_dump()
    cat = db.query(Category).filter(Category.id == income.category_id).first()
    d["category_name"] = cat.name if cat else None
    return d


@router.delete("/{income_id}", response_model=ApiResponse)
def delete_income(
    income_id: int,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    ref = income.number
    db.delete(income)
    db.commit()
    _log_audit(db, current_user.id, "Suppression entrée", ref, f"Entrée {ref} supprimée", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return ApiResponse(message="Entrée supprimée avec succès")

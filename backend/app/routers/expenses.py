import json
import asyncio
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from app.database import get_db
from app.models import Expense, AuditLog, Category
from app.auth import get_current_user
from app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseApprove, ExpenseReject, ApiResponse
from app.ws_manager import get_ws_manager

router = APIRouter(prefix="/api/expenses", tags=["Dépenses"])


def _generate_number(db: Session) -> str:
    last = db.query(func.max(Expense.number)).scalar()
    if last and last.startswith("EX-"):
        num = int(last.split("-")[1]) + 1
    else:
        num = 1
    return f"EX-{num:04d}"


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
def list_expenses(
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
    query = db.query(Expense).options(joinedload(Expense.category), joinedload(Expense.approver), joinedload(Expense.recorder))
    if search:
        like = f"%{search}%"
        query = query.filter(Expense.description.ilike(like) | Expense.number.ilike(like) | Expense.beneficiary.ilike(like))
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if status:
        query = query.filter(Expense.status == status)
    if date_from:
        query = query.filter(Expense.date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(Expense.date <= date.fromisoformat(date_to))
    total = query.count()
    items = query.order_by(Expense.date.desc()).offset(skip).limit(limit).all()
    result = []
    for e in items:
        d = ExpenseResponse.model_validate(e).model_dump()
        d["category_name"] = e.category.name if e.category else None
        d["approver_name"] = f"{e.approver.first_name} {e.approver.last_name}" if e.approver else None
        d["recorder_name"] = f"{e.recorder.first_name} {e.recorder.last_name}" if e.recorder else None
        result.append(d)
    return {"total": total, "items": result}


@router.get("/total")
def total_expense(
    year: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.status == "Approuvé")
    if year:
        query = query.filter(extract("year", Expense.date) == year)
    total = query.scalar()
    return {"total": float(total)}


@router.get("/pending-total")
def pending_total(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    total = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.status == "En attente").scalar()
    return {"total": float(total)}


@router.get("/counts")
def expense_counts(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    pending = db.query(func.count(Expense.id)).filter(Expense.status == "En attente").scalar()
    approved = db.query(func.count(Expense.id)).filter(Expense.status == "Approuvé").scalar()
    rejected = db.query(func.count(Expense.id)).filter(Expense.status == "Rejeté").scalar()
    return {"en_attente": pending or 0, "approuve": approved or 0, "rejete": rejected or 0}


@router.get("/monthly")
def monthly_expense(
    year: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not year:
        year = date.today().year
    rows = (
        db.query(
            extract("month", Expense.date).label("month"),
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
        )
        .filter(extract("year", Expense.date) == year, Expense.status == "Approuvé")
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
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
            func.count(Expense.id).label("count"),
        )
        .join(Expense, Expense.category_id == Category.id)
        .filter(extract("year", Expense.date) == year, Expense.status == "Approuvé")
        .group_by(Category.name)
        .all()
    )
    return [{"category": r[0], "total": float(r[1]), "count": r[2]} for r in rows]


@router.get("/{expense_id}")
def get_expense(expense_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    expense = (
        db.query(Expense)
        .options(joinedload(Expense.category), joinedload(Expense.approver), joinedload(Expense.recorder))
        .filter(Expense.id == expense_id)
        .first()
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Dépense non trouvée")
    d = ExpenseResponse.model_validate(expense).model_dump()
    d["category_name"] = expense.category.name if expense.category else None
    d["approver_name"] = f"{expense.approver.first_name} {expense.approver.last_name}" if expense.approver else None
    d["recorder_name"] = f"{expense.recorder.first_name} {expense.recorder.last_name}" if expense.recorder else None
    return d


@router.post("")
def create_expense(
    data: ExpenseCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    expense = Expense(
        number=_generate_number(db),
        date=data.date,
        category_id=data.category_id,
        description=data.description,
        amount=data.amount,
        beneficiary=data.beneficiary,
        document_reference=data.document_reference,
        status=data.status,
        recorded_by=data.recorded_by or current_user.id,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    _log_audit(db, current_user.id, "Création dépense", expense.number, f"Dépense {expense.number} de {expense.amount} FCFA créée", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    d = ExpenseResponse.model_validate(expense).model_dump()
    cat = db.query(Category).filter(Category.id == expense.category_id).first()
    d["category_name"] = cat.name if cat else None
    d["recorder_name"] = f"{current_user.first_name} {current_user.last_name}"
    return d


@router.put("/{expense_id}")
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Dépense non trouvée")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    _log_audit(db, current_user.id, "Modification dépense", expense.number, f"Dépense {expense.number} modifiée", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    d = ExpenseResponse.model_validate(expense).model_dump()
    cat = db.query(Category).filter(Category.id == expense.category_id).first()
    d["category_name"] = cat.name if cat else None
    return d


@router.delete("/{expense_id}", response_model=ApiResponse)
def delete_expense(
    expense_id: int,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Dépense non trouvée")
    ref = expense.number
    db.delete(expense)
    db.commit()
    _log_audit(db, current_user.id, "Suppression dépense", ref, f"Dépense {ref} supprimée", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return ApiResponse(message="Dépense supprimée avec succès")


@router.post("/{expense_id}/approve", response_model=ApiResponse)
def approve_expense(
    expense_id: int,
    data: ExpenseApprove,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Dépense non trouvée")
    expense.status = "Approuvé"
    expense.approved_by = data.approved_by
    db.commit()
    _log_audit(db, current_user.id, "Approbation dépense", expense.number, f"Dépense {expense.number} approuvée", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return ApiResponse(message="Dépense approuvée avec succès")


@router.post("/{expense_id}/reject", response_model=ApiResponse)
def reject_expense(
    expense_id: int,
    data: ExpenseReject,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Dépense non trouvée")
    expense.status = "Rejeté"
    expense.rejection_reason = data.rejection_reason
    db.commit()
    _log_audit(db, current_user.id, "Rejet dépense", expense.number, f"Dépense {expense.number} rejetée: {data.rejection_reason}", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return ApiResponse(message="Dépense rejetée")

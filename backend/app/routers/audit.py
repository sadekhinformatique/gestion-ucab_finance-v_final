from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import AuditLog
from app.auth import get_current_user
from app.schemas import AuditLogResponse

router = APIRouter(prefix="/api/audit", tags=["Audit"])


@router.get("")
def list_audit_logs(
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logs = (
        db.query(AuditLog)
        .options(joinedload(AuditLog.user))
        .order_by(AuditLog.created_at.desc())
        .offset(skip)
        .limit(min(limit, 500))
        .all()
    )
    result = []
    for log in logs:
        d = AuditLogResponse.model_validate(log).model_dump()
        d["user_name"] = f"{log.user.first_name} {log.user.last_name}" if log.user else None
        result.append(d)
    return result


@router.get("/search")
def search_audit(
    action: str = "",
    user_id: int = None,
    date_from: str = "",
    date_to: str = "",
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(AuditLog).options(joinedload(AuditLog.user))
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if date_from:
        query = query.filter(AuditLog.date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(AuditLog.date <= date.fromisoformat(date_to))
    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(min(limit, 500)).all()
    result = []
    for log in logs:
        d = AuditLogResponse.model_validate(log).model_dump()
        d["user_name"] = f"{log.user.first_name} {log.user.last_name}" if log.user else None
        result.append(d)
    return {"total": total, "items": result}

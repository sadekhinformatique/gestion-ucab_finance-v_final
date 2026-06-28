import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Member, AuditLog
from app.auth import get_current_user
from app.schemas import MemberCreate, MemberUpdate, MemberResponse, ApiResponse
from app.ws_manager import get_ws_manager

router = APIRouter(prefix="/api/members", tags=["Membres"])


def _generate_member_number(db: Session) -> str:
    last = db.query(func.max(Member.member_number)).scalar()
    if last and last.startswith("MEM-"):
        num = int(last.split("-")[1]) + 1
    else:
        num = 1
    return f"MEM-{num:04d}"


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
def list_members(
    search: str = "",
    department: str = "",
    status: str = "",
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(Member)
    if search:
        like = f"%{search}%"
        query = query.filter(
            Member.first_name.ilike(like) | Member.last_name.ilike(like) | Member.member_number.ilike(like)
        )
    if department:
        query = query.filter(Member.department == department)
    if status:
        query = query.filter(Member.subscription_status == status)
    total = query.count()
    members = query.order_by(Member.last_name).offset(skip).limit(limit).all()
    return {"total": total, "items": [MemberResponse.model_validate(m).model_dump() for m in members]}


@router.get("/stats")
def member_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    total = db.query(func.count(Member.id)).scalar()
    uptodate = db.query(func.count(Member.id)).filter(Member.subscription_status == "À jour").scalar()
    late = db.query(func.count(Member.id)).filter(Member.subscription_status == "En retard").scalar()
    dept = db.query(Member.department, func.count(Member.id)).filter(Member.department.isnot(None)).group_by(Member.department).all()
    return {
        "total": total or 0,
        "a_jour": uptodate or 0,
        "en_retard": late or 0,
        "taux_a_jour": round((uptodate / total * 100), 1) if total else 0,
        "departements": [{"name": d[0], "count": d[1]} for d in dept],
    }


@router.get("/departments")
def list_departments(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    depts = db.query(Member.department).filter(Member.department.isnot(None)).distinct().order_by(Member.department).all()
    return [d[0] for d in depts]


@router.get("/{member_id}")
def get_member(member_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    return MemberResponse.model_validate(member).model_dump()


@router.post("")
def create_member(
    data: MemberCreate,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    member = Member(
        member_number=_generate_member_number(db),
        first_name=data.first_name,
        last_name=data.last_name,
        department=data.department,
        level=data.level,
        phone=data.phone,
        email=data.email,
        subscription_status=data.subscription_status,
        registration_date=data.registration_date,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    _log_audit(db, current_user.id, "Création membre", member.member_number, f"Membre {member.first_name} {member.last_name} créé", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return MemberResponse.model_validate(member).model_dump()


@router.put("/{member_id}")
def update_member(
    member_id: int,
    data: MemberUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(member, field, value)
    db.commit()
    db.refresh(member)
    _log_audit(db, current_user.id, "Modification membre", member.member_number, f"Membre {member.first_name} {member.last_name} modifié", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return MemberResponse.model_validate(member).model_dump()


@router.delete("/{member_id}", response_model=ApiResponse)
def delete_member(
    member_id: int,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    ref = member.member_number
    db.delete(member)
    db.commit()
    _log_audit(db, current_user.id, "Suppression membre", ref, f"Membre {ref} supprimé", req)
    try:
        ws_manager = get_ws_manager()
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass
    return ApiResponse(message="Membre supprimé avec succès")

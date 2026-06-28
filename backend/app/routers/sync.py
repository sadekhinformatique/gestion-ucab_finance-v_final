import json
from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Member, Income, Expense, Category, User, AppSettings
from app.auth import get_current_user
from app.schemas import SyncBatch, ApiResponse
from app.ws_manager import get_ws_manager

router = APIRouter(prefix="/api/sync", tags=["Synchronisation"])


@router.websocket("/ws")
async def sync_websocket(websocket: WebSocket):
    ws_manager = get_ws_manager()
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@router.post("/push", response_model=ApiResponse)
def sync_push(
    batch: SyncBatch,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.routers.members import _generate_member_number
    from app.routers.incomes import _generate_number as _gen_income_number
    from app.routers.expenses import _generate_number as _gen_expense_number

    results = []
    for op in batch.operations:
        try:
            table = op.table
            action = op.action
            data = op.data

            if table == "members" and action == "create":
                member = Member(
                    member_number=_generate_member_number(db),
                    first_name=data.get("first_name"),
                    last_name=data.get("last_name"),
                    department=data.get("department"),
                    level=data.get("level"),
                    phone=data.get("phone"),
                    email=data.get("email"),
                    subscription_status=data.get("subscription_status", "À jour"),
                )
                db.add(member)
                db.flush()
                results.append({"table": "members", "action": "create", "success": True, "local_id": data.get("local_id")})

            elif table == "incomes" and action == "create":
                income = Income(
                    number=_gen_income_number(db),
                    date=data.get("date"),
                    category_id=data.get("category_id"),
                    description=data.get("description"),
                    amount=data.get("amount"),
                    source=data.get("source"),
                    receipt_reference=data.get("receipt_reference"),
                    status=data.get("status", "Approuvé"),
                    user_id=current_user.id,
                )
                db.add(income)
                db.flush()
                results.append({"table": "incomes", "action": "create", "success": True, "local_id": data.get("local_id")})

            elif table == "expenses" and action == "create":
                expense = Expense(
                    number=_gen_expense_number(db),
                    date=data.get("date"),
                    category_id=data.get("category_id"),
                    description=data.get("description"),
                    amount=data.get("amount"),
                    beneficiary=data.get("beneficiary"),
                    document_reference=data.get("document_reference"),
                    status="En attente",
                    recorded_by=current_user.id,
                )
                db.add(expense)
                db.flush()
                results.append({"table": "expenses", "action": "create", "success": True, "local_id": data.get("local_id")})

            else:
                results.append({"table": table, "action": action, "success": False, "error": "Unsupported operation"})

        except Exception as e:
            results.append({"table": op.table, "action": op.action, "success": False, "error": str(e), "local_id": op.data.get("local_id")})

    db.commit()

    try:
        ws_manager = get_ws_manager()
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(ws_manager.broadcast(json.dumps({"type": "sync", "message": "data_changed"})))
    except Exception:
        pass

    return ApiResponse(message=f"{len(results)} opérations traitées", data={"results": results})


@router.get("/pull")
def sync_pull(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    members = db.query(Member).order_by(Member.id).all()
    incomes = (
        db.query(Income)
        .options(joinedload(Income.category), joinedload(Income.user))
        .order_by(Income.id)
        .all()
    )
    expenses = (
        db.query(Expense)
        .options(joinedload(Expense.category), joinedload(Expense.approver), joinedload(Expense.recorder))
        .order_by(Expense.id)
        .all()
    )
    categories = db.query(Category).order_by(Category.id).all()
    users = db.query(User).options(joinedload(User.permissions)).order_by(User.id).all()
    settings = db.query(AppSettings).all()

    def _serialize(obj, exclude=None):
        if exclude is None:
            exclude = {"password_hash"}
        d = {}
        for col in obj.__table__.columns:
            if col.name not in exclude:
                val = getattr(obj, col.name)
                d[col.name] = str(val) if hasattr(val, "isoformat") else val
        return d

    return {
        "members": [_serialize(m) for m in members],
        "incomes": [_serialize(i) for i in incomes],
        "expenses": [_serialize(e) for e in expenses],
        "categories": [_serialize(c) for c in categories],
        "users": [_serialize(u) for u in users],
        "settings": {s.setting_key: s.setting_value for s in settings},
    }

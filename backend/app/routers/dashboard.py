from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.database import get_db
from app.models import Income, Expense, Member, Category
from app.auth import get_current_user
from app.schemas import DashboardSummary

router = APIRouter(prefix="/api/dashboard", tags=["Tableau de bord"])


@router.get("/summary")
def dashboard_summary(
    year: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not year:
        year = date.today().year

    total_income = (
        db.query(func.coalesce(func.sum(Income.amount), 0))
        .filter(
            extract("year", Income.date) == year,
            Income.status == "Approuvé",
        )
        .scalar()
    )
    total_expense = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            extract("year", Expense.date) == year,
            Expense.status == "Approuvé",
        )
        .scalar()
    )
    total_members = db.query(func.count(Member.id)).scalar()
    uptodate = (
        db.query(func.count(Member.id))
        .filter(Member.subscription_status == "À jour")
        .scalar()
    )

    pending = (
        db.query(func.count(Expense.id))
        .filter(Expense.status == "En attente")
        .scalar()
    )
    approved = (
        db.query(func.count(Expense.id))
        .filter(Expense.status == "Approuvé")
        .scalar()
    )
    rejected = (
        db.query(func.count(Expense.id))
        .filter(Expense.status == "Rejeté")
        .scalar()
    )

    return DashboardSummary(
        total_income=float(total_income),
        total_expense=float(total_expense),
        balance=float(total_income) - float(total_expense),
        total_members=total_members or 0,
        subscription_rate=round((uptodate / total_members * 100), 1) if total_members else 0,
        pending_expenses=pending or 0,
        approved_expenses=approved or 0,
        rejected_expenses=rejected or 0,
    )


@router.get("/monthly-evolution")
def monthly_evolution(
    year: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not year:
        year = date.today().year

    income_rows = (
        db.query(
            extract("month", Income.date).label("month"),
            func.coalesce(func.sum(Income.amount), 0).label("total"),
        )
        .filter(
            extract("year", Income.date) == year,
            Income.status == "Approuvé",
        )
        .group_by("month")
        .order_by("month")
        .all()
    )
    expense_rows = (
        db.query(
            extract("month", Expense.date).label("month"),
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
        )
        .filter(
            extract("year", Expense.date) == year,
            Expense.status == "Approuvé",
        )
        .group_by("month")
        .order_by("month")
        .all()
    )

    income_map = {int(r[0]): float(r[1]) for r in income_rows}
    expense_map = {int(r[0]): float(r[1]) for r in expense_rows}

    result = []
    for m in range(1, 13):
        inc = income_map.get(m, 0)
        exp = expense_map.get(m, 0)
        result.append({
            "month": m,
            "income": inc,
            "expense": exp,
            "balance": inc - exp,
        })
    return result


@router.get("/income-breakdown")
def income_breakdown(
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
        )
        .join(Income, Income.category_id == Category.id)
        .filter(
            extract("year", Income.date) == year,
            Income.status == "Approuvé",
        )
        .group_by(Category.name)
        .all()
    )
    return [{"category": r[0], "total": float(r[1])} for r in rows]


@router.get("/expense-breakdown")
def expense_breakdown(
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
        )
        .join(Expense, Expense.category_id == Category.id)
        .filter(
            extract("year", Expense.date) == year,
            Expense.status == "Approuvé",
        )
        .group_by(Category.name)
        .all()
    )
    return [{"category": r[0], "total": float(r[1])} for r in rows]

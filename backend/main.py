"""
SAS UCAB FINANCE API - FastAPI Application
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db
from app.routers import auth, members, incomes, expenses, users, categories, audit, dashboard, sync
from app.routers import settings as settings_router

cfg = get_settings()

app = FastAPI(
    title=cfg.APP_NAME,
    version=cfg.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(members.router)
app.include_router(incomes.router)
app.include_router(expenses.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(audit.router)
app.include_router(dashboard.router)
app.include_router(settings_router.router)
app.include_router(sync.router)


@app.on_event("startup")
def on_startup():
    init_db()
    seed_default_data()


def seed_default_data():
    from app.database import SessionLocal
    from app.models import User, UserPermission, Category, AppSettings
    from app.auth import hash_password
    db = SessionLocal()
    try:
        if not db.query(User).first():
            admin = User(
                username="admin",
                password_hash=hash_password("admin123"),
                first_name="Administrateur",
                last_name="Système",
                email="admin@sas-ucab.sn",
                role="Président",
                is_active=True
            )
            db.add(admin)
            db.flush()
            resources = ["membres", "utilisateurs", "entrees", "depenses", "categories", "rapports", "parametres", "sauvegarde", "audit"]
            perms = ["Lecture", "Écriture", "Modification", "Validation", "Suppression", "Export"]
            for res in resources:
                for perm in perms:
                    db.add(UserPermission(user_id=admin.id, resource=res, permission=perm))
        if not db.query(Category).first():
            for cat in ["Cotisations", "Dons", "Subventions", "Événements", "Sponsoring", "Ventes", "Autres"]:
                db.add(Category(name=cat, type="INCOME"))
            for cat in ["Frais administratifs", "Événements", "Communication", "Transport", "Fournitures", "Services", "Autres"]:
                db.add(Category(name=cat, type="EXPENSE"))
        defaults = {
            "association_name": "SAS UCAB Dakar",
            "academic_year": "2025-2026",
            "currency": "FCFA",
            "annual_subscription": "5000",
            "theme": "dark",
            "auto_backup": "true",
            "backup_interval_days": "7"
        }
        for k, v in defaults.items():
            if not db.query(AppSettings).filter(AppSettings.setting_key == k).first():
                db.add(AppSettings(setting_key=k, setting_value=v))
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

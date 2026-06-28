from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AppSettings, AuditLog
from app.auth import get_current_user
from app.schemas import SettingsUpdate, ApiResponse

router = APIRouter(prefix="/api/settings", tags=["Paramètres"])


@router.get("")
def get_settings(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    rows = db.query(AppSettings).all()
    return {row.setting_key: row.setting_value for row in rows}


@router.put("", response_model=ApiResponse)
def update_settings(
    data: SettingsUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    for key, value in data.settings.items():
        setting = db.query(AppSettings).filter(AppSettings.setting_key == key).first()
        if setting:
            setting.setting_value = str(value)
        else:
            db.add(AppSettings(setting_key=key, setting_value=str(value)))
    db.commit()
    log = AuditLog(
        action="Modification paramètres",
        user_id=current_user.id,
        details="Paramètres mis à jour",
        ip_address=req.client.host if req.client else None,
    )
    db.add(log)
    db.commit()
    return ApiResponse(message="Paramètres mis à jour avec succès")

from fastapi import Depends, HTTPException, status
from app.auth import get_current_user
from app.models import User


class PermissionChecker:
    def __init__(self, resource: str, permission: str):
        self.resource = resource
        self.permission = permission

    def __call__(self, current_user: User = Depends(get_current_user)):
        if current_user.role in ["Président", "Vice-président"]:
            return True
        for p in current_user.permissions:
            if p.resource == self.resource and p.permission == self.permission:
                return True
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied"
        )


def require_permission(resource: str, permission: str):
    return PermissionChecker(resource, permission)

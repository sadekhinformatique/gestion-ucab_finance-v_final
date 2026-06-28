from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str = ""
    user_id: Optional[int] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class UserPermissionResponse(BaseModel):
    id: int
    resource: str
    permission: str

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = "Membre"
    permissions: Optional[list[dict]] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    permissions: Optional[list[dict]] = None


class UserResponse(BaseModel):
    id: int
    username: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    is_active: bool
    login_attempts: int
    locked_until: Optional[datetime] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    permissions: list[UserPermissionResponse] = []

    model_config = {"from_attributes": True}


class MemberCreate(BaseModel):
    first_name: str
    last_name: str
    department: Optional[str] = None
    level: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    subscription_status: str = "À jour"
    registration_date: Optional[date] = None


class MemberUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    level: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    subscription_status: Optional[str] = None
    registration_date: Optional[date] = None


class MemberResponse(BaseModel):
    id: int
    member_number: str
    first_name: str
    last_name: str
    department: Optional[str] = None
    level: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    subscription_status: str
    registration_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str
    type: str
    description: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class IncomeCreate(BaseModel):
    date: date
    category_id: int
    description: Optional[str] = None
    amount: float
    source: Optional[str] = None
    receipt_reference: Optional[str] = None
    status: str = "Approuvé"
    user_id: Optional[int] = None


class IncomeUpdate(BaseModel):
    date: Optional[date] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    source: Optional[str] = None
    receipt_reference: Optional[str] = None
    status: Optional[str] = None


class IncomeResponse(BaseModel):
    id: int
    number: str
    date: date
    category_id: int
    description: Optional[str] = None
    amount: float
    source: Optional[str] = None
    receipt_reference: Optional[str] = None
    status: str
    user_id: int
    created_at: Optional[datetime] = None
    category_name: Optional[str] = None
    user_name: Optional[str] = None

    model_config = {"from_attributes": True}


class ExpenseCreate(BaseModel):
    date: date
    category_id: int
    description: Optional[str] = None
    amount: float
    beneficiary: Optional[str] = None
    document_reference: Optional[str] = None
    status: str = "En attente"
    recorded_by: Optional[int] = None


class ExpenseUpdate(BaseModel):
    date: Optional[date] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    beneficiary: Optional[str] = None
    document_reference: Optional[str] = None
    status: Optional[str] = None


class ExpenseApprove(BaseModel):
    approved_by: int


class ExpenseReject(BaseModel):
    rejection_reason: str


class ExpenseResponse(BaseModel):
    id: int
    number: str
    date: date
    category_id: int
    description: Optional[str] = None
    amount: float
    beneficiary: Optional[str] = None
    document_reference: Optional[str] = None
    status: str
    approved_by: Optional[int] = None
    recorded_by: int
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    category_name: Optional[str] = None
    approver_name: Optional[str] = None
    recorder_name: Optional[str] = None

    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    id: int
    date: Optional[date] = None
    time: Optional[str] = None
    user_id: Optional[int] = None
    action: str
    reference: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None
    user_name: Optional[str] = None

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    settings: dict


class DashboardSummary(BaseModel):
    total_income: float = 0
    total_expense: float = 0
    balance: float = 0
    total_members: int = 0
    subscription_rate: float = 0
    pending_expenses: int = 0
    approved_expenses: int = 0
    rejected_expenses: int = 0


class SyncItem(BaseModel):
    table: str
    action: str
    data: dict


class SyncBatch(BaseModel):
    operations: list[SyncItem]


class ChangePassword(BaseModel):
    old_password: str
    new_password: str


class ApiResponse(BaseModel):
    success: bool = True
    message: str = "Operation successful"
    data: Optional[dict | list] = None

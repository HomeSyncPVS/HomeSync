from enum import Enum


class RoleEnum(str, Enum):
    SUPER_ADMIN = "Super Admin"
    SOCIETY_ADMIN = "Society Admin"
    COMMITTEE_MEMBER = "Committee Member"
    RESIDENT = "Resident"


class PermissionEnum(str, Enum):
    # User Management
    MANAGE_USERS = "users:manage"
    VIEW_USERS = "users:view"
    
    # Audit & System
    VIEW_AUDIT_LOGS = "system:audit_logs"
    MANAGE_SETTINGS = "system:settings"
    
    # Society Management
    MANAGE_SOCIETY = "society:manage"
    VIEW_SOCIETY = "society:view"
    
    # Resident / IoT Operations
    RESIDENT_ACCESS = "resident:access"
    MANAGE_DEVICES = "devices:manage"


class OtpPurpose(str, Enum):
    REGISTER = "register"
    VERIFY = "verify"
    LOGIN = "login"
    RESET = "reset"


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"


class BillStatus(str, Enum):
    DRAFT = "DRAFT"
    GENERATED = "GENERATED"
    SENT = "SENT"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class BillType(str, Enum):
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    ANNUAL = "ANNUAL"
    ONE_TIME = "ONE_TIME"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class PaymentMethod(str, Enum):
    UPI = "UPI"
    BANK_TRANSFER = "BANK_TRANSFER"
    CASH = "CASH"
    CHEQUE = "CHEQUE"
    ONLINE = "ONLINE"

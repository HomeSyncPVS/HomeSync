from enum import Enum


class RoleEnum(str, Enum):
    SUPER_ADMIN = "Super Admin"
    ADMIN = "Admin"
    RESIDENT = "Resident"
    STAFF = "Staff"
    SECRETARY = "Secretary"
    CHAIRMAN = "Chairman"


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
    MAINTENANCE = "MAINTENANCE"
    WATER = "WATER"
    PARKING = "PARKING"
    OTHER = "OTHER"


class PaymentStatus(str, Enum):
    CREATED = "CREATED"
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class PaymentMethod(str, Enum):
    UPI = "UPI"
    CARD = "CARD"
    NETBANKING = "NETBANKING"
    WALLET = "WALLET"
    CASH = "CASH"
    CHEQUE = "CHEQUE"
    ONLINE_GATEWAY = "ONLINE_GATEWAY"

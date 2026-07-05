from enum import Enum


class RoleEnum(str, Enum):
    SUPER_ADMIN = "Super Admin"
    ADMIN = "Admin"
    RESIDENT = "Resident"
    STAFF = "Staff"


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

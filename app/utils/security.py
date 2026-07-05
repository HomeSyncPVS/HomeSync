import secrets
import string


def generate_random_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token (e.g. for email verification, password reset).
    """
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_otp_code() -> str:
    """
    Generate a secure 6-digit numeric OTP.
    """
    return "".join(secrets.choice(string.digits) for _ in range(6))

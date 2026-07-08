import logging
import httpx
from app.core.config import settings

logger = logging.getLogger("homesync.email")

RESEND_API_URL = "https://api.resend.com/emails"


def send_email(to_email: str, subject: str, html_content: str) -> None:
    """
    Send an HTML email via Resend API (HTTPS - works on Render free tier).
    Falls back to dev mock log if RESEND_API_KEY is not set.
    """
    if not settings.RESEND_API_KEY:
        logger.warning(
            f"\n--- [DEVELOPMENT EMAIL MOCK] ---\n"
            f"To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Body:\n{html_content}\n"
            f"---------------------------------\n"
        )
        return

    from_address = (
        f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        if settings.EMAILS_FROM_NAME and settings.EMAILS_FROM_EMAIL
        else "HomeSync <onboarding@resend.dev>"
    )

    payload = {
        "from": from_address,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = httpx.post(RESEND_API_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        logger.info(f"Email sent to {to_email} successfully via Resend. id={response.json().get('id')}")
    except httpx.HTTPStatusError as e:
        logger.error(f"Resend API error sending email to {to_email}: {e.response.status_code} - {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"Error sending email to {to_email}: {str(e)}", exc_info=True)
        raise


def send_verification_email(email: str, token: str) -> None:
    subject = "Verify your HomeSync Account"
    link = f"{settings.BACKEND_URL}/api/v1/auth/verify-email?token={token}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #2F6FED;">Welcome to HomeSync! 🏠</h1>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="{link}" style="display:inline-block; background-color: #2F6FED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Verify Email
        </a>
        <p style="margin-top: 20px; color: #666;">Or copy and paste this link in your browser:</p>
        <code style="word-break: break-all; color: #444;">{link}</code>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not create an account, you can safely ignore this email.</p>
    </div>
    """
    send_email(email, subject, html_content)


def send_password_reset_email(email: str, token: str) -> None:
    subject = "Reset your HomeSync Password"
    link = f"{settings.BACKEND_URL}/api/v1/auth/reset-password?token={token}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #2F6FED;">Password Reset Request 🔑</h1>
        <p>We received a request to reset your password. Click the button below:</p>
        <a href="{link}" style="display:inline-block; background-color: #008CBA; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reset Password
        </a>
        <p style="margin-top: 20px; color: #666;">Or copy this link:</p>
        <code style="word-break: break-all; color: #444;">{link}</code>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not request this, you can safely ignore this email.</p>
    </div>
    """
    send_email(email, subject, html_content)


def send_otp_email(email: str, otp: str, purpose: str) -> None:
    subject = f"Your HomeSync OTP Code for {purpose.capitalize()}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #2F6FED;">One-Time Password (OTP) 🔐</h1>
        <p>Your OTP code for <strong>{purpose}</strong> is:</p>
        <h2 style="letter-spacing: 10px; color: #2F6FED; font-size: 36px; text-align: center; padding: 20px; background: #f0f5ff; border-radius: 8px;">{otp}</h2>
        <p style="color: #666;">This code expires in <strong>10 minutes</strong>. Please do not share this code with anyone.</p>
    </div>
    """
    send_email(email, subject, html_content)


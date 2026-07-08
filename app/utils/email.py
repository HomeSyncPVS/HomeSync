import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("homesync.email")


def send_email(to_email: str, subject: str, html_content: str) -> None:
    """
    Send an HTML email via SMTP server, or log it if SMTP configurations are missing.
    """
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning(
            f"\n--- [DEVELOPMENT EMAIL MOCK] ---\n"
            f"To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Body:\n{html_content}\n"
            f"---------------------------------\n"
        )
        return

    msg = MIMEMultipart()
    msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_content, "html"))

    try:
        # Use SMTP_SSL on port 465 (works on Render / cloud hosts where port 587 is blocked)
        port = settings.SMTP_PORT or 465
        if port == 465:
            import ssl
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, port, context=context) as server:
                if settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, port) as server:
                server.starttls()
                if settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        logger.info(f"Email sent to {to_email} successfully.")
    except Exception as e:
        logger.error(f"SMTP ERROR sending email to {to_email}: {str(e)}", exc_info=True)
        raise


def send_verification_email(email: str, token: str) -> None:
    subject = "Verify your HomeSync Account"
    link = f"{settings.BACKEND_URL}/api/v1/auth/verify-email?token={token}"
    html_content = f"""
    <h1>Welcome to HomeSync!</h1>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="{link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
    <p>Or use the following token in your request:</p>
    <code>{token}</code>
    """
    send_email(email, subject, html_content)


def send_password_reset_email(email: str, token: str) -> None:
    subject = "Reset your HomeSync Password"
    link = f"{settings.BACKEND_URL}/api/v1/auth/reset-password?token={token}"
    html_content = f"""
    <h1>Password Reset Request</h1>
    <p>We received a request to reset your password. Click the link below to change your password:</p>
    <a href="{link}" style="background-color: #008CBA; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>Or use the following reset token in your request:</p>
    <code>{token}</code>
    <p>If you did not request this, you can safely ignore this email.</p>
    """
    send_email(email, subject, html_content)


def send_otp_email(email: str, otp: str, purpose: str) -> None:
    subject = f"Your HomeSync OTP Code for {purpose.capitalize()}"
    html_content = f"""
    <h1>One-Time Password (OTP)</h1>
    <p>Your OTP code for <strong>{purpose}</strong> is:</p>
    <h2 style="letter-spacing: 5px; color: #333;">{otp}</h2>
    <p>This code expires in 10 minutes. Please do not share this code with anyone.</p>
    """
    send_email(email, subject, html_content)

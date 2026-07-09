import logging
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger("homesync.email")


def _send_smtp_sync(to_email: str, subject: str, html_content: str) -> None:
    """
    Synchronous SMTP helper to be run in a separate thread.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    
    from_name = settings.SMTP_FROM_NAME or settings.EMAILS_FROM_NAME or "HomeSync"
    from_email = settings.SMTP_FROM_EMAIL or settings.EMAILS_FROM_EMAIL or settings.SMTP_USERNAME or settings.SMTP_USER
    if not from_email:
        raise ValueError("SMTP sender email address is not configured. Set SMTP_FROM_EMAIL or SMTP_USERNAME in environment.")
        
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    smtp_host = settings.SMTP_HOST
    if not smtp_host:
        raise ValueError("SMTP host is not configured. Set SMTP_HOST in environment.")
        
    smtp_port = settings.SMTP_PORT or 587
    smtp_user = settings.SMTP_USERNAME or settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD

    logger.info(f"Connecting to SMTP server {smtp_host}:{smtp_port}...")
    
    if smtp_port == 465:
        try:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15.0)
        except Exception as e:
            logger.error(f"Failed to initiate SMTP_SSL connection to {smtp_host}:{smtp_port}: {str(e)}")
            raise e
    else:
        try:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=15.0)
        except Exception as e:
            logger.error(f"Failed to initiate SMTP connection to {smtp_host}:{smtp_port}: {str(e)}")
            raise e
        
    try:
        if smtp_port != 465:
            server.ehlo()
            server.starttls()
            server.ehlo()
            
        if smtp_user and smtp_password:
            try:
                server.login(smtp_user, smtp_password)
            except smtplib.SMTPAuthenticationError as e:
                logger.error(f"SMTP authentication failed for user {smtp_user}: {str(e)}")
                raise e
            
        server.sendmail(from_email, [to_email], msg.as_string())
        logger.info(f"Email sent successfully via SMTP to {to_email}")
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error occurred during sending: {str(e)}")
        raise e
    finally:
        try:
            server.quit()
        except Exception:
            pass


async def send_email(to_email: str, subject: str, html_content: str) -> None:
    """
    Send an HTML email via SMTP only.
    """
    if not settings.SMTP_HOST:
        logger.warning(
            f"\n--- [DEVELOPMENT EMAIL MOCK] ---\n"
            f"To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Body:\n{html_content}\n"
            f"---------------------------------\n"
        )
        return

    try:
        await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_content)
    except Exception as e:
        logger.error(f"Error sending email to {to_email} via SMTP: {str(e)}", exc_info=True)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Email SMTP Error: {str(e)}")


async def send_password_reset_email(email: str, token: str) -> None:
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
    await send_email(email, subject, html_content)


async def send_otp_email(email: str, otp: str, purpose: str) -> None:
    if purpose == "register" or purpose == "verify":
        subject = "Verify Your Email"
        html_content = f"""
        Hello,<br><br>
        Your verification code is:<br><br>
        <strong>{otp}</strong><br><br>
        This code is valid for <strong>10 minutes</strong>.<br><br>
        If you did not create this account, you can safely ignore this email.
        """
    else:
        subject = f"Your HomeSync OTP Code for {purpose.capitalize()}"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #2F6FED;">One-Time Password (OTP) 🔐</h1>
            <p>Your OTP code for <strong>{purpose}</strong> is:</p>
            <h2 style="letter-spacing: 10px; color: #2F6FED; font-size: 36px; text-align: center; padding: 20px; background: #f0f5ff; border-radius: 8px;">{otp}</h2>
            <p style="color: #666;">This code expires in <strong>10 minutes</strong>. Please do not share this code with anyone.</p>
        </div>
        """
    await send_email(email, subject, html_content)

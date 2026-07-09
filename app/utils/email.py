import logging
import smtplib
import asyncio
import httpx
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
    
    from_name = settings.EMAILS_FROM_NAME or "HomeSync"
    from_email = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER or "noreply@homesync.com"
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT or 587

    if smtp_port == 465:
        server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10.0)
    else:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10.0)
        
    try:
        if smtp_port != 465:
            server.ehlo()
            server.starttls()
            server.ehlo()
            
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
        server.sendmail(from_email, [to_email], msg.as_string())
    finally:
        server.quit()


async def send_email(to_email: str, subject: str, html_content: str) -> None:
    """
    Send an HTML email.
    If RESEND_API_KEY is configured, sends via Resend HTTP API (avoids blocked cloud SMTP ports).
    Otherwise, falls back to SMTP if SMTP_HOST is set, or dev log mock.
    """
    # 1. Try Resend HTTP API (strongly recommended for cloud hosting platforms like Railway/Render)
    if settings.RESEND_API_KEY:
        from_address = "HomeSync <onboarding@resend.dev>"
        payload = {
            "from": from_address,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    json=payload,
                    headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"}
                )
                if response.status_code >= 400:
                    err_msg = response.text
                    try:
                        err_json = response.json()
                        if "message" in err_json:
                            err_msg = err_json["message"]
                    except Exception:
                        pass
                    raise Exception(f"Resend error ({response.status_code}): {err_msg}")
            logger.info(f"Email sent to {to_email} successfully via Resend API.")
            return
        except Exception as e:
            logger.error(f"Error sending email to {to_email} via Resend: {str(e)}", exc_info=True)
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Email API Error: {str(e)}")

    # 2. Try SMTP fallback
    if settings.SMTP_HOST:
        try:
            await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_content)
            logger.info(f"Email sent to {to_email} successfully via SMTP.")
            return
        except Exception as e:
            logger.error(f"Error sending email to {to_email} via SMTP: {str(e)}", exc_info=True)
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Email SMTP Error: {str(e)}")

    # 3. Development mock log fallback
    logger.warning(
        f"\n--- [DEVELOPMENT EMAIL MOCK] ---\n"
        f"To: {to_email}\n"
        f"Subject: {subject}\n"
        f"Body:\n{html_content}\n"
        f"---------------------------------\n"
    )


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

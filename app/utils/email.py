import logging
import smtplib
import asyncio
import socket
import httpx
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
from app.exceptions.custom import ServiceUnavailableError

logger = logging.getLogger("homesync.email")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


class EmailService:

    # ==========================================
    # PRIMARY: Brevo HTTP API
    # ==========================================

    @classmethod
    async def _send_via_brevo_api(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> None:
        """
        Sends an email using Brevo's transactional email HTTP API.
        Fully async — no threads required.
        Docs: https://developers.brevo.com/reference/sendtransacemail
        """
        payload = {
            "sender": {
                "name": settings.BREVO_SENDER_NAME,
                "email": settings.BREVO_SENDER_EMAIL,
            },
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content,
        }
        if text_content:
            payload["textContent"] = text_content

        headers = {
            "api-key": settings.BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        logger.info(f"[Brevo API] Sending email to {to_email} via Brevo HTTP API...")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(BREVO_API_URL, json=payload, headers=headers)

            if response.status_code in (200, 201):
                logger.info(f"[Brevo API] Email accepted for delivery to {to_email} (status {response.status_code})")
                return

            # Handle known Brevo error codes
            error_body = response.text
            logger.error(f"[Brevo API] Error response ({response.status_code}): {error_body}")

            if response.status_code == 401:
                raise ServiceUnavailableError(
                    detail="Email service authentication failed. Please contact support.",
                    error_code="EMAIL_AUTH_FAILED",
                )
            if response.status_code == 429:
                raise ServiceUnavailableError(
                    detail="Email service rate limit exceeded. Please try again shortly.",
                    error_code="EMAIL_LIMIT_EXCEEDED",
                )
            raise ServiceUnavailableError(
                detail="Email delivery failed. Please try again later.",
                error_code="EMAIL_DELIVERY_FAILED",
            )

        except httpx.TimeoutException:
            logger.error(f"[Brevo API] Request timed out sending to {to_email}")
            raise ServiceUnavailableError(
                detail="Email service timed out. Please try again later.",
                error_code="EMAIL_TIMEOUT",
            )
        except httpx.RequestError as e:
            logger.error(f"[Brevo API] Network error sending to {to_email}: {str(e)}")
            raise ServiceUnavailableError(
                detail="Email service is temporarily unavailable. Please try again later.",
                error_code="EMAIL_SERVICE_ERROR",
            )

    # ==========================================
    # SMTP CONFIG & CONNECTIONS (Gmail / Brevo)
    # ==========================================

    @classmethod
    def get_smtp_config(cls) -> dict:
        """
        Resolves SMTP credentials and settings dynamically based on EMAIL_PROVIDER.
        Supported EMAIL_PROVIDER values:
          - 'gmail' or 'gmail_smtp'
          - 'brevo_smtp'
          - 'brevo' or 'brevo_api'
          - 'mock'
        """
        provider = getattr(settings, "EMAIL_PROVIDER", "gmail").lower().strip()

        if provider in ("gmail", "gmail_smtp"):
            smtp_host = settings.GMAIL_SMTP_HOST or "smtp.gmail.com"
            smtp_port = settings.GMAIL_SMTP_PORT or 587
            smtp_user = settings.GMAIL_SMTP_USER
            smtp_password = settings.GMAIL_SMTP_PASSWORD
            from_email = settings.GMAIL_FROM_EMAIL or smtp_user
            from_name = settings.GMAIL_FROM_NAME or "HomeSync"
            provider_type = "gmail"
        elif provider in ("brevo_smtp", "brevo-smtp"):
            smtp_host = settings.BREVO_SMTP_HOST or settings.SMTP_HOST or "smtp-relay.brevo.com"
            smtp_port = settings.BREVO_SMTP_PORT or settings.SMTP_PORT or 587
            smtp_user = (
                settings.BREVO_SMTP_USERNAME
                or settings.BREVO_SMTP_USER
                or settings.SMTP_USERNAME
                or settings.SMTP_USER
            )
            smtp_password = settings.BREVO_SMTP_PASSWORD or settings.SMTP_PASSWORD
            from_email = (
                settings.BREVO_FROM_EMAIL
                or settings.SMTP_FROM_EMAIL
                or settings.EMAILS_FROM_EMAIL
                or settings.BREVO_SENDER_EMAIL
            )
            from_name = (
                settings.BREVO_FROM_NAME
                or settings.SMTP_FROM_NAME
                or settings.EMAILS_FROM_NAME
                or "HomeSync"
            )
            provider_type = "brevo_smtp"
        elif provider in ("brevo", "brevo_api", "brevo-api"):
            provider_type = "brevo_api"
            smtp_host = None
            smtp_port = None
            smtp_user = None
            smtp_password = None
            from_email = settings.BREVO_SENDER_EMAIL
            from_name = settings.BREVO_SENDER_NAME
        elif provider == "mock":
            provider_type = "mock"
            smtp_host = None
            smtp_port = None
            smtp_user = None
            smtp_password = None
            from_email = "mock@homesync.local"
            from_name = "HomeSync Mock"
        else:
            # Fallback to generic SMTP
            smtp_host = settings.SMTP_HOST or settings.GMAIL_SMTP_HOST or "smtp.gmail.com"
            smtp_port = settings.SMTP_PORT or settings.GMAIL_SMTP_PORT or 587
            smtp_user = (
                settings.SMTP_USERNAME
                or settings.SMTP_USER
                or settings.GMAIL_SMTP_USER
            )
            smtp_password = settings.SMTP_PASSWORD or settings.GMAIL_SMTP_PASSWORD
            from_email = (
                settings.SMTP_FROM_EMAIL
                or settings.EMAILS_FROM_EMAIL
                or settings.GMAIL_FROM_EMAIL
                or smtp_user
            )
            from_name = (
                settings.SMTP_FROM_NAME
                or settings.EMAILS_FROM_NAME
                or settings.GMAIL_FROM_NAME
                or "HomeSync"
            )
            provider_type = "smtp"

        return {
            "provider_type": provider_type,
            "smtp_host": smtp_host,
            "smtp_port": smtp_port,
            "smtp_user": smtp_user,
            "smtp_password": smtp_password,
            "from_email": from_email,
            "from_name": from_name,
        }

    @classmethod
    def get_smtp_connection(cls) -> smtplib.SMTP:
        """Establishes and authenticates a TCP connection to the active SMTP server."""
        cfg = cls.get_smtp_config()
        smtp_host = cfg["smtp_host"]
        smtp_port = cfg["smtp_port"] or 587
        smtp_user = cfg["smtp_user"]
        smtp_password = cfg["smtp_password"]

        if not smtp_host:
            raise ValueError(f"SMTP host is not configured for provider '{settings.EMAIL_PROVIDER}'.")

        try:
            ip = socket.gethostbyname(smtp_host)
            logger.info(f"[{cfg['provider_type'].upper()} DNS] Resolved {smtp_host} -> {ip}")
        except socket.gaierror as e:
            logger.error(f"[{cfg['provider_type'].upper()} DNS Error] Failed to resolve {smtp_host}: {str(e)}")
            raise smtplib.SMTPConnectError(-1, f"SMTP DNS resolution failed for '{smtp_host}': {str(e)}")

        server = None
        try:
            logger.info(f"[{cfg['provider_type'].upper()} TCP] Connecting to {smtp_host}:{smtp_port}...")
            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15.0)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=15.0)
                server.ehlo()
                server.starttls()
                server.ehlo()
            logger.info(f"[{cfg['provider_type'].upper()} TCP] Connected to {smtp_host}:{smtp_port}")

            if smtp_user and smtp_password:
                logger.info(f"[{cfg['provider_type'].upper()} Auth] Logging in as '{smtp_user}'...")
                server.login(smtp_user, smtp_password)
                logger.info(f"[{cfg['provider_type'].upper()} Auth] Login successful.")

            return server
        except Exception as e:
            if server:
                try:
                    server.quit()
                except Exception:
                    pass
            raise e

    # Alias for backwards compatibility
    _get_smtp_connection = get_smtp_connection

    @classmethod
    def _send_smtp_sync(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> None:
        """Synchronous SMTP handler — runs in a thread pool."""
        cfg = cls.get_smtp_config()
        from_name = cfg["from_name"]
        from_email = str(cfg["from_email"])

        if not from_email:
            raise ValueError("Sender email is not configured.")

        if not text_content:
            text_content = f"Subject: {subject}\n\nPlease view this email in an HTML-compatible client."

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        server = cls.get_smtp_connection()
        try:
            logger.info(f"[{cfg['provider_type'].upper()}] Transmitting to {to_email}...")
            server.sendmail(from_email, [to_email], msg.as_string())
            logger.info(f"[{cfg['provider_type'].upper()}] Email accepted for delivery to {to_email}")
        except smtplib.SMTPDataError as e:
            code = e.args[0]
            err_msg = e.args[1].decode("utf-8", errors="replace") if isinstance(e.args[1], bytes) else str(e.args[1])
            logger.error(f"[SMTP Error] ({code}) {err_msg}")
            if code == 550 and "Daily user sending limit" in err_msg:
                raise ServiceUnavailableError(
                    detail="Email service daily sending limit exceeded. Please try again later.",
                    error_code="EMAIL_LIMIT_EXCEEDED",
                )
            raise ServiceUnavailableError(
                detail="Failed to deliver email. Please try again later.",
                error_code="EMAIL_DELIVERY_FAILED",
            )
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"[SMTP Auth Error] {str(e)}")
            raise ServiceUnavailableError(
                detail=f"Email service authentication failed ({cfg['provider_type']}). Check credentials in .env.",
                error_code="EMAIL_AUTH_FAILED",
            )
        except smtplib.SMTPException as e:
            logger.error(f"[SMTP Error] {str(e)}")
            raise ServiceUnavailableError(
                detail="Email service is temporarily unavailable.",
                error_code="EMAIL_SERVICE_ERROR",
            )
        finally:
            try:
                server.quit()
            except Exception:
                pass

    # ==========================================
    # PUBLIC INTERFACE
    # ==========================================

    @classmethod
    async def send_email(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> None:
        """
        Primary send method.
        Routes email sending based on EMAIL_PROVIDER in settings ('gmail', 'brevo_smtp', 'brevo_api', 'mock').
        """
        cfg = cls.get_smtp_config()
        provider_type = cfg["provider_type"]

        if provider_type in ("gmail", "brevo_smtp", "smtp"):
            logger.info(f"[Email] Dispatching via {provider_type.upper()} SMTP to {to_email}...")
            try:
                await asyncio.to_thread(cls._send_smtp_sync, to_email, subject, html_content, text_content)
                return
            except Exception as e:
                logger.error(f"[Email] {provider_type.upper()} SMTP dispatch failed: {str(e)}")
                if settings.BREVO_API_KEY:
                    logger.warning("[Email] Falling back to Brevo HTTP API...")
                    await cls._send_via_brevo_api(to_email, subject, html_content, text_content)
                    return
                raise e

        if provider_type == "brevo_api":
            if settings.BREVO_API_KEY:
                logger.info(f"[Email] Dispatching via Brevo HTTP API to {to_email}...")
                await cls._send_via_brevo_api(to_email, subject, html_content, text_content)
                return
            logger.warning("[Email] BREVO_API_KEY is not set — falling back to dev mock.")

        # Development mock — no sending configured
        logger.warning(
            f"\n--- [DEVELOPMENT EMAIL MOCK ({provider_type.upper()})] ---\n"
            f"To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Body (HTML):\n{html_content}\n"
            f"---------------------------------------------------\n"
        )

    @classmethod
    async def send_otp_email(cls, email: str, otp: str, purpose: str) -> None:
        """Renders and sends the 6-digit OTP email."""
        if purpose in ("register", "verify"):
            subject = "Verify Your Email"
            text_content = (
                f"Hello,\n\nYour verification code is: {otp}\n\n"
                f"This code is valid for 10 minutes.\n\n"
                f"If you did not request this, you can safely ignore this email."
            )
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
                <h1 style="color: #2F6FED; text-align: center;">Verify Your Email 📧</h1>
                <p>Hello,</p>
                <p>Thank you for registering. Your verification code is:</p>
                <h2 style="letter-spacing: 10px; color: #2F6FED; font-size: 36px; text-align: center; padding: 20px; background: #f0f5ff; border-radius: 8px;">{otp}</h2>
                <p style="color: #666;">This code is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not request this, you can safely ignore this email.</p>
            </div>
            """
        else:
            subject = f"Your HomeSync OTP Code for {purpose.capitalize()}"
            text_content = (
                f"Hello,\n\nYour OTP code for {purpose} is: {otp}\n\n"
                f"This code expires in 10 minutes.\n\n"
                f"If you did not request this, you can safely ignore this email."
            )
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
                <h1 style="color: #2F6FED; text-align: center;">One-Time Password (OTP) 🔐</h1>
                <p>Your OTP code for <strong>{purpose}</strong> is:</p>
                <h2 style="letter-spacing: 10px; color: #2F6FED; font-size: 36px; text-align: center; padding: 20px; background: #f0f5ff; border-radius: 8px;">{otp}</h2>
                <p style="color: #666;">This code expires in <strong>10 minutes</strong>. Please do not share this code with anyone.</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not request this, you can safely ignore this email.</p>
            </div>
            """
        await cls.send_email(email, subject, html_content, text_content)

    @classmethod
    async def send_password_reset_email(cls, email: str, token: str) -> None:
        """Renders and sends the password reset link email."""
        subject = "Reset your HomeSync Password"
        link = f"{settings.BACKEND_URL}/api/v1/auth/reset-password?token={token}"
        text_content = (
            f"Password Reset Request 🔑\n\n"
            f"We received a request to reset your password.\n\n"
            f"Reset link: {link}\n\n"
            f"If you did not request this, you can safely ignore this email."
        )
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #2F6FED;">Password Reset Request 🔑</h1>
            <p>We received a request to reset your password. Click the button below:</p>
            <a href="{link}" style="display:inline-block; background-color: #2F6FED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Reset Password
            </a>
            <p style="margin-top: 20px; color: #666;">Or copy this link:</p>
            <code style="word-break: break-all; color: #444;">{link}</code>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not request this, you can safely ignore this email.</p>
        </div>
        """
        await cls.send_email(email, subject, html_content, text_content)


def verify_smtp_connectivity() -> bool:
    """
    Startup connectivity check.
    Performs DNS resolution and TCP socket test for the configured email provider.
    """
    cfg = EmailService.get_smtp_config()
    provider_type = cfg["provider_type"]

    if provider_type == "brevo_api":
        if settings.BREVO_API_KEY:
            logger.info("[Email Startup] Provider set to 'brevo_api'. Brevo HTTP API is configured.")
            return True
        logger.warning("[Email Startup] BREVO_API_KEY is not configured.")
        return False

    if provider_type == "mock":
        logger.info("[Email Startup] Provider set to 'mock'. Running in DEV MOCK mode.")
        return True

    smtp_host = cfg["smtp_host"]
    smtp_port = cfg["smtp_port"] or 587

    if not smtp_host:
        logger.warning(f"[Email Startup] No SMTP host configured for provider '{provider_type}'. Running in DEV MOCK mode.")
        return False

    logger.info(f"[{provider_type.upper()} Startup] Testing connectivity to {smtp_host}:{smtp_port}...")
    try:
        ip = socket.gethostbyname(smtp_host)
        logger.info(f"[{provider_type.upper()} Startup] DNS resolved: {smtp_host} -> {ip}")
    except socket.gaierror as e:
        logger.error(f"[{provider_type.upper()} Startup] DNS resolution failed for {smtp_host}: {str(e)}")
        return False

    try:
        s = socket.create_connection((smtp_host, smtp_port), timeout=5.0)
        s.close()
        logger.info(f"[{provider_type.upper()} Startup] TCP connection to {smtp_host}:{smtp_port} OK.")
        return True
    except socket.timeout:
        logger.error(f"[{provider_type.upper()} Startup] Connection timeout to {smtp_host}:{smtp_port}. Port may be blocked.")
        return False
    except (ConnectionRefusedError, OSError) as e:
        logger.error(f"[{provider_type.upper()} Startup] Connection failed to {smtp_host}:{smtp_port}: {str(e)}")
        return False


# ==========================================
# Backward-compatible top-level helpers
# ==========================================

async def send_email(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> None:
    await EmailService.send_email(to_email, subject, html_content, text_content)


async def send_otp_email(email: str, otp: str, purpose: str) -> None:
    await EmailService.send_otp_email(email, otp, purpose)


async def send_password_reset_email(email: str, token: str) -> None:
    await EmailService.send_password_reset_email(email, token)

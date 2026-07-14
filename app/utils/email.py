import logging
import smtplib
import asyncio
import socket
from typing import Any, Dict, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger("homesync.email")


class EmailService:
    @classmethod
    def get_smtp_connection(cls) -> smtplib.SMTP:
        """
        Establishes and authenticates a TCP connection to the SMTP server.
        Logs details and bubbles up explicit exceptions on failure.
        """
        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT or 587
        smtp_user = settings.SMTP_USERNAME or settings.SMTP_USER
        smtp_password = settings.SMTP_PASSWORD

        if not smtp_host:
            raise ValueError("SMTP_HOST is not configured.")

        # 1. DNS Resolution Check
        try:
            ip = socket.gethostbyname(smtp_host)
            logger.info(f"[SMTP DNS] Resolved {smtp_host} -> {ip}")
        except socket.gaierror as e:
            logger.error(f"[SMTP DNS Error] Failed to resolve SMTP host {smtp_host}: {str(e)}")
            raise smtplib.SMTPConnectError(-1, f"SMTP DNS resolution failed for hostname '{smtp_host}': {str(e)}")

        server = None
        try:
            logger.info(f"[SMTP TCP] Connecting to {smtp_host}:{smtp_port}...")
            
            # Connect based on port protocol (Port 465 SSL, standard STARTTLS otherwise)
            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15.0)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=15.0)
                server.ehlo()
                server.starttls()
                server.ehlo()
                
            logger.info(f"[SMTP TCP] Connected successfully to {smtp_host}:{smtp_port}")

            # Authentication
            if smtp_user and smtp_password:
                logger.info(f"[SMTP Auth] Logging in as '{smtp_user}'...")
                server.login(smtp_user, smtp_password)
                logger.info("[SMTP Auth] Login successful.")
                
            return server
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"[SMTP Auth Error] Authentication failed for user '{smtp_user}': {str(e)}")
            if server:
                try:
                    server.quit()
                except Exception:
                    pass
            raise e
        except socket.timeout as e:
            logger.error(f"[SMTP Network Timeout Error] Connection to {smtp_host}:{smtp_port} timed out: {str(e)}")
            if server:
                try:
                    server.quit()
                except Exception:
                    pass
            raise e
        except OSError as e:
            logger.error(f"[SMTP OSError] Network connectivity failure connecting to {smtp_host}:{smtp_port}: {str(e)}")
            if server:
                try:
                    server.quit()
                except Exception:
                    pass
            raise e
        except Exception as e:
            logger.error(f"[SMTP Connection Error] Failed to establish SMTP session: {str(e)}")
            if server:
                try:
                    server.quit()
                except Exception:
                    pass
            raise e

    @classmethod
    def _send_smtp_sync(cls, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> None:
        """
        Synchronous SMTP helper to be run in a separate thread.
        Uses connection-per-request model with detailed logging and explicit exception bubbling.
        """
        smtp_user = settings.SMTP_USERNAME or settings.SMTP_USER
        from_name = settings.SMTP_FROM_NAME or "HomeSync"
        from_email = settings.SMTP_FROM_EMAIL or smtp_user

        if not from_email:
            raise ValueError("SMTP sender email address is not configured. Set SMTP_FROM_EMAIL or SMTP_USERNAME in environment.")

        if not text_content:
            # Simple text fallback stripping HTML tags
            text_content = f"Subject: {subject}\n\nPlease view this email in an HTML-compatible client."

        # Create MIME structure
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        # Attach text part first, then HTML part (standard RFC 2046 alternative layout)
        part_text = MIMEText(text_content, "plain", "utf-8")
        part_html = MIMEText(html_content, "html", "utf-8")
        msg.attach(part_text)
        msg.attach(part_html)

        server = cls.get_smtp_connection()
        try:
            logger.info(f"[SMTP Transmission] Transmitting email to {to_email}...")
            server.sendmail(from_email, [to_email], msg.as_string())
            logger.info(f"[SMTP Success] Email accepted by SMTP server for delivery to {to_email}")
        except Exception as e:
            logger.error(f"[SMTP Transmission Error] Failed to send email to {to_email}: {str(e)}")
            raise e
        finally:
            if server:
                try:
                    server.quit()
                except Exception:
                    pass

    @classmethod
    async def send_email(cls, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> None:
        """
        Public async send method. Delegates SMTP delivery to a separate worker thread.
        """
        if not settings.SMTP_HOST:
            logger.warning(
                f"\n--- [DEVELOPMENT EMAIL MOCK] ---\n"
                f"To: {to_email}\n"
                f"Subject: {subject}\n"
                f"Body (HTML):\n{html_content}\n"
                f"---------------------------------\n"
            )
            return

        # Explicitly run in thread pool to prevent blocking event loop
        await asyncio.to_thread(cls._send_smtp_sync, to_email, subject, html_content, text_content)

    @classmethod
    async def send_otp_email(cls, email: str, otp: str, purpose: str) -> None:
        """
        Renders and transmits the 6-digit OTP code email.
        """
        if purpose in ("register", "verify"):
            subject = "Verify Your Email"
            text_content = f"Hello,\n\nYour verification code is: {otp}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this, you can safely ignore this email."
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
            text_content = f"Hello,\n\nYour OTP code for {purpose} is: {otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, you can safely ignore this email."
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
        """
        Renders and transmits the password reset link email.
        """
        subject = "Reset your HomeSync Password"
        link = f"{settings.BACKEND_URL}/api/v1/auth/reset-password?token={token}"
        text_content = f"Password Reset Request 🔑\n\nWe received a request to reset your password. Click the link below to reset your password:\n\n{link}\n\nIf you did not request this, you can safely ignore this email."
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
    Standalone SMTP connectivity test run during application startup.
    Performs DNS resolution and attempts a brief TCP connection test
    to verify network access to the SMTP server.
    """
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT or 587
    
    if not smtp_host:
        logger.warning("[SMTP Startup Check] SMTP_HOST is not configured. Standalone email service is disabled (running in DEV MOCK mode).")
        return False
        
    logger.info(f"[SMTP Startup Check] Starting SMTP connectivity test for {smtp_host}:{smtp_port}...")
    
    # 1. DNS Resolution
    try:
        ip = socket.gethostbyname(smtp_host)
        logger.info(f"[SMTP Startup Check] DNS resolved successfully: {smtp_host} -> {ip}")
    except socket.gaierror as e:
        logger.error(
            f"[SMTP Startup Check] DNS resolution failed for {smtp_host}: {str(e)}. "
            "Please check if the hostname is correct and that the host machine has outbound DNS/internet access."
        )
        return False

    # 2. Outbound Network Connectivity Check
    try:
        s = socket.create_connection((smtp_host, smtp_port), timeout=5.0)
        s.close()
        logger.info(f"[SMTP Startup Check] Success! Outbound TCP connection to {smtp_host}:{smtp_port} established.")
        return True
    except socket.timeout:
        logger.error(
            f"[SMTP Startup Check] Connection timeout to {smtp_host}:{smtp_port}. "
            "This indicates outbound TCP traffic is being blocked at the firewall level. "
            "NOTE: Railway trial/hobby plans block ports 25, 465, and 587 by default. "
            "To resolve this, upgrade to a Pro plan or configure an SMTP relay using port 2525."
        )
        return False
    except ConnectionRefusedError:
        logger.error(
            f"[SMTP Startup Check] Connection refused by {smtp_host}:{smtp_port}. "
            "Verify that the port number is correct and that the destination server is accepting connections on this port."
        )
        return False
    except OSError as e:
        logger.error(
            f"[SMTP Startup Check] Network connectivity failure connecting to {smtp_host}:{smtp_port}: {str(e)}. "
            "If you see '[Errno 101] Network is unreachable', it confirms that Railway's outbound SMTP blocking "
            "is active on your current hosting tier."
        )
        return False


# Re-expose top-level helper functions for backward compatibility
async def send_email(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> None:
    await EmailService.send_email(to_email, subject, html_content, text_content)

async def send_otp_email(email: str, otp: str, purpose: str) -> None:
    await EmailService.send_otp_email(email, otp, purpose)

async def send_password_reset_email(email: str, token: str) -> None:
    await EmailService.send_password_reset_email(email, token)

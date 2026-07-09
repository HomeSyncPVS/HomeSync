import logging
import smtplib
import asyncio
import socket
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger("homesync.email")


def verify_smtp_connectivity() -> bool:
    """
    Standalone SMTP connectivity test run during application startup.
    Performs DNS resolution and attempts a brief TCP connection test
    to verify network access to the SMTP server.
    Logs success or specific failure reasons (e.g. DNS, connection timeout, port blocked).
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


def _send_smtp_sync(to_email: str, subject: str, html_content: str) -> None:
    """
    Synchronous SMTP helper to be run in a separate thread.
    Exposes detailed logging and raises explicit traceback context.
    """
    smtp_host = settings.SMTP_HOST
    if not smtp_host:
        raise ValueError("SMTP_HOST is not configured.")
        
    smtp_port = settings.SMTP_PORT or 587
    smtp_user = settings.SMTP_USERNAME or settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD
    from_name = settings.SMTP_FROM_NAME or settings.EMAILS_FROM_NAME or "HomeSync"
    from_email = settings.SMTP_FROM_EMAIL or settings.EMAILS_FROM_EMAIL or smtp_user

    if not from_email:
        raise ValueError("SMTP sender email address is not configured. Set SMTP_FROM_EMAIL or SMTP_USERNAME in environment.")

    # Create message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to_email
    part = MIMEText(html_content, "html")
    msg.attach(part)

    # 1. DNS Resolution Check
    try:
        ip = socket.gethostbyname(smtp_host)
        logger.info(f"[SMTP DNS] Host resolved successfully: {smtp_host} -> {ip}")
    except socket.gaierror as e:
        logger.exception(f"[SMTP DNS Error] Failed to resolve SMTP host {smtp_host}")
        raise Exception(f"SMTP DNS resolution failed for hostname '{smtp_host}': {str(e)}")

    server = None
    try:
        logger.info(f"[SMTP TCP] Connecting to {smtp_host}:{smtp_port}...")
        
        # Connect based on port protocol (Port 465 SSL, Port 587 STARTTLS)
        if smtp_port == 465:
            try:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15.0)
            except Exception as e:
                logger.exception(f"[SMTP SSL Handshake Error] Failed SSL connection to {smtp_host}:{smtp_port}")
                raise e
        else:
            try:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=15.0)
            except Exception as e:
                logger.exception(f"[SMTP TCP Connection Error] Failed to connect to {smtp_host}:{smtp_port}")
                raise e

        # Protocol handshake & TLS
        try:
            if smtp_port != 465:
                server.ehlo()
                server.starttls()
                server.ehlo()
        except Exception as e:
            logger.exception(f"[SMTP TLS Handshake Error] TLS negotiation failed on port {smtp_port}")
            raise e

        # Authentication
        if smtp_user and smtp_password:
            try:
                server.login(smtp_user, smtp_password)
            except smtplib.SMTPAuthenticationError as e:
                logger.exception(f"[SMTP Auth Error] Authentication failed for user '{smtp_user}'")
                raise Exception(
                    f"SMTP Authentication failed (username: {smtp_user}). "
                    "If using Gmail SMTP, verify 2-Step Verification is enabled and a valid Google App Password is configured. "
                    f"Details: {str(e)}"
                )

        # Transmission
        try:
            server.sendmail(from_email, [to_email], msg.as_string())
            logger.info(f"[SMTP Success] Email sent successfully to {to_email} via SMTP.")
        except Exception as e:
            logger.exception(f"[SMTP Transmission Error] Failed to send email to {to_email}")
            raise e
            
    except socket.timeout:
        logger.exception(f"[SMTP Network Timeout Error] Connection to {smtp_host}:{smtp_port} timed out")
        raise Exception(
            f"SMTP connection timeout on port {smtp_port}. "
            "This indicates outbound TCP traffic is being blocked/dropped by the network firewall (e.g. Railway blocks ports 25, 465, and 587)."
        )
    except OSError as e:
        if getattr(e, 'errno', None) == 101 or "Network is unreachable" in str(e):
            logger.exception(f"[SMTP Network Unreachable Error] Port {smtp_port} network unreachable on host {smtp_host}")
            raise Exception(
                "Network is unreachable ([Errno 101]). "
                "Outbound SMTP traffic to standard ports (25, 465, 587) is blocked by the Railway firewall on Hobby/Trial tiers. "
                "Please upgrade your Railway plan to paid Pro, or use an alternative port like 2525."
            )
        else:
            logger.exception(f"[SMTP OSError] Network connectivity failure connecting to {smtp_host}:{smtp_port}")
            raise e
    except Exception as e:
        logger.exception(f"[SMTP Unhandled Error] Error occurred during SMTP execution")
        raise e
    finally:
        if server:
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
        raise HTTPException(status_code=500, detail=str(e))


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

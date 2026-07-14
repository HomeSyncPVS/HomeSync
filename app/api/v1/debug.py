import traceback
import socket
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/debug", tags=["Debug"])


@router.get("/smtp-test", summary="Run full diagnostics on SMTP connection")
async def test_smtp_endpoint():
    steps = {
        "1_load_config": {"status": "pending", "details": {}},
        "2_dns_resolution": {"status": "pending", "details": {}},
        "3_tcp_connection": {"status": "pending", "details": {}},
        "4_smtp_handshake_and_tls": {"status": "pending", "details": {}},
        "5_smtp_login": {"status": "pending", "details": {}},
        "6_send_test_email": {"status": "pending", "details": {}},
    }
    
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT or 587
    smtp_user = settings.SMTP_USERNAME or settings.SMTP_USER
    smtp_password = settings.SMTP_PASSWORD
    from_name = settings.SMTP_FROM_NAME or settings.EMAILS_FROM_NAME or "HomeSync Debug"
    from_email = settings.SMTP_FROM_EMAIL or settings.EMAILS_FROM_EMAIL or smtp_user

    # 1. Load config
    steps["1_load_config"] = {
        "status": "success",
        "details": {
            "smtp_host": smtp_host,
            "smtp_port": smtp_port,
            "smtp_username": smtp_user,
            "smtp_password_masked": f"{smtp_password[:3]}***" if smtp_password else None,
            "smtp_from_email": from_email,
            "smtp_from_name": from_name
        }
    }
    
    if not smtp_host:
        steps["2_dns_resolution"] = {"status": "failed", "details": {"error": "SMTP_HOST is not configured."}}
        return {"success": False, "message": "SMTP_HOST not configured", "steps": steps}

    # 2. DNS Resolution
    try:
        ip = socket.gethostbyname(smtp_host)
        steps["2_dns_resolution"] = {
            "status": "success",
            "details": {
                "resolved_ip": ip,
                "host": smtp_host
            }
        }
    except Exception as e:
        steps["2_dns_resolution"] = {
            "status": "failed",
            "details": {
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        }
        return {"success": False, "message": f"DNS resolution failed: {str(e)}", "steps": steps}

    # 3. TCP Connection
    try:
        s = socket.create_connection((smtp_host, smtp_port), timeout=10.0)
        s.close()
        steps["3_tcp_connection"] = {
            "status": "success",
            "details": {
                "message": f"Outbound TCP connection to {smtp_host}:{smtp_port} succeeded."
            }
        }
    except Exception as e:
        steps["3_tcp_connection"] = {
            "status": "failed",
            "details": {
                "error": str(e),
                "traceback": traceback.format_exc(),
                "note": "A timeout or network unreachable error indicates outbound SMTP ports are blocked by Railway or host network."
            }
        }
        return {"success": False, "message": f"TCP connection failed: {str(e)}", "steps": steps}

    # 4. SMTP Handshake & TLS/SSL
    server = None
    try:
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10.0)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=10.0)
            server.ehlo()
            server.starttls()
            server.ehlo()

        steps["4_smtp_handshake_and_tls"] = {
            "status": "success",
            "details": {
                "message": f"SMTP handshake and security negotiation on port {smtp_port} succeeded."
            }
        }
    except Exception as e:
        steps["4_smtp_handshake_and_tls"] = {
            "status": "failed",
            "details": {
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        }
        if server:
            try:
                server.quit()
            except Exception:
                pass
        return {"success": False, "message": f"SMTP Handshake or TLS/SSL failed: {str(e)}", "steps": steps}

    # 5. SMTP Login
    try:
        if smtp_user and smtp_password:
            server.login(smtp_user, smtp_password)
            steps["5_smtp_login"] = {
                "status": "success",
                "details": {
                    "message": f"Successfully authenticated user: {smtp_user}"
                }
            }
        else:
            steps["5_smtp_login"] = {
                "status": "skipped",
                "details": {
                    "message": "No username or password provided, skipping authentication."
                }
            }
    except Exception as e:
        steps["5_smtp_login"] = {
            "status": "failed",
            "details": {
                "error": str(e),
                "traceback": traceback.format_exc(),
                "note": "Verify 2-Step Verification is enabled and a Google App Password is used if configuring Gmail SMTP."
            }
        }
        try:
            server.quit()
        except Exception:
            pass
        return {"success": False, "message": f"SMTP Login failed: {str(e)}", "steps": steps}

    # 6. Send Test Email
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "HomeSync SMTP Service Diagnostics Test"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = from_email
        
        body = f"""
        <html>
            <body>
                <h2 style="color: #2F6FED;">HomeSync SMTP Verification Test 🚀</h2>
                <p>If you are reading this email, the SMTP email service is working perfectly!</p>
                <p><strong>SMTP Host:</strong> {smtp_host}</p>
                <p><strong>SMTP Port:</strong> {smtp_port}</p>
                <p><strong>Recipient / Sender:</strong> {from_email}</p>
            </body>
        </html>
        """
        msg.attach(MIMEText(body, "html"))
        server.sendmail(from_email, [from_email], msg.as_string())
        
        steps["6_send_test_email"] = {
            "status": "success",
            "details": {
                "recipient": from_email,
                "message": "Test email sent successfully."
            }
        }
    except Exception as e:
        steps["6_send_test_email"] = {
            "status": "failed",
            "details": {
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        }
        return {"success": False, "message": f"SMTP send failed: {str(e)}", "steps": steps}
    finally:
        try:
            server.quit()
        except Exception:
            pass

    return {
        "success": True,
        "message": "All SMTP diagnostic checks passed successfully! Email delivered.",
        "steps": steps
    }


from pydantic import BaseModel, EmailStr

class TestEmailRequest(BaseModel):
    email: EmailStr

@router.post("/test-email", summary="Send a test email to a custom address")
async def test_email_endpoint(data: TestEmailRequest):
    import time
    start_time = time.time()
    steps = []
    
    # 1. Check config
    steps.append("Config loaded")
    
    # 2. Connect and authenticate
    try:
        from app.utils.email import EmailService
        steps.append("Resolving DNS & establishing connection...")
        server = EmailService.get_smtp_connection()
        steps.append("SMTP connected and authenticated successfully.")
        
        # 3. Build & send email
        smtp_user = settings.SMTP_USERNAME or settings.SMTP_USER
        from_name = settings.SMTP_FROM_NAME or "HomeSync Debug"
        from_email = settings.SMTP_FROM_EMAIL or smtp_user
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "HomeSync Production Test Email"
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = data.email
        
        body = f"""
        <html>
            <body>
                <h2 style="color: #2F6FED;">HomeSync Production Test Email 🚀</h2>
                <p>This is a manual SMTP test triggered from the debug endpoint.</p>
                <p>If you received this email, SMTP delivery to Gmail is working perfectly.</p>
            </body>
        </html>
        """
        msg.attach(MIMEText(body, "html"))
        
        steps.append(f"Transmitting mail to {data.email}...")
        server.sendmail(from_email, [data.email], msg.as_string())
        steps.append("Email accepted by SMTP relay.")
        
        server.quit()
        elapsed = time.time() - start_time
        return {
            "success": True,
            "message": "Test email sent successfully.",
            "steps": steps,
            "elapsed_seconds": round(elapsed, 3)
        }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            "success": False,
            "message": str(e),
            "steps": steps,
            "elapsed_seconds": round(elapsed, 3),
            "traceback": traceback.format_exc()
        }


@router.get("/email-health", summary="Get SMTP email system health status")
async def email_health_endpoint():
    from app.utils.email import verify_smtp_connectivity
    
    smtp_reachable = verify_smtp_connectivity()
    
    smtp_user = settings.SMTP_USERNAME or settings.SMTP_USER
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT or 587
    from_email = settings.SMTP_FROM_EMAIL or smtp_user
    
    env_ok = all([
        settings.SMTP_HOST,
        settings.SMTP_PORT,
        settings.SMTP_USERNAME,
        settings.SMTP_PASSWORD,
        settings.SMTP_FROM_EMAIL,
        settings.SMTP_FROM_NAME
    ])
    
    # Try logging in to verify auth
    auth_ok = False
    auth_error = None
    if smtp_reachable:
        try:
            from app.utils.email import EmailService
            conn = EmailService.get_smtp_connection()
            conn.quit()
            auth_ok = True
        except Exception as e:
            auth_error = str(e)
            
    return {
        "smtp_reachable": smtp_reachable,
        "auth_ok": auth_ok,
        "auth_error": auth_error,
        "environment_variables_ok": env_ok,
        "brevo_reachable": smtp_reachable,
        "sender_configured": from_email,
        "configuration": {
            "host": smtp_host,
            "port": smtp_port,
            "user": smtp_user,
            "from_email": from_email,
            "from_name": settings.SMTP_FROM_NAME
        }
    }

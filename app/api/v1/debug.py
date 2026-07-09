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

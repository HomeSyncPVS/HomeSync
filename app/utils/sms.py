import logging

logger = logging.getLogger("homesync.sms")


def send_otp_sms(phone: str, code: str, purpose: str) -> None:
    """
    Send OTP code via SMS (Mocked for development, logs to terminal).
    """
    logger.warning(
        f"\n--- [DEVELOPMENT SMS MOCK] ---\n"
        f"To: {phone}\n"
        f"Message: Your HomeSync OTP code for {purpose} is {code}. It is valid for 10 minutes.\n"
        f"-------------------------------\n"
    )

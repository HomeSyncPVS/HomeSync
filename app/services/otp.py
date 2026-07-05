from datetime import datetime, timedelta, timezone
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.otp import OtpCode
from app.repositories.otp import OTPRepository
from app.core.security import hash_token
from app.core.redis import redis_client, check_redis_connection
from app.utils.security import generate_otp_code
from app.utils.email import send_otp_email
from app.utils.sms import send_otp_sms
from app.exceptions.custom import ValidationError, RateLimitError

otp_repo = OTPRepository()


class OTPService:
    @staticmethod
    async def generate_and_send_otp(db: AsyncSession, target: str, purpose: str) -> OtpCode:
        """
        Generate a 6-digit OTP code, save the hash in the DB, and send it to email/phone.
        """
        # Enforce send rate limits in Redis (e.g., maximum 1 OTP per 60 seconds per target)
        if await check_redis_connection():
            send_limit_key = f"otp_send_limit:{target}:{purpose}"
            is_limited = await redis_client.get(send_limit_key)
            if is_limited:
                raise RateLimitError(
                    detail="Please wait at least 60 seconds before requesting another OTP.",
                    error_code="OTP_SEND_LIMIT_EXCEEDED"
                )
            # Set rate limit
            await redis_client.setex(send_limit_key, 60, "1")

        code = generate_otp_code()
        code_hash = hash_token(code)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        # Invalidate previous OTPs of same target & purpose
        active_previous = await otp_repo.get_active_otp(db, target, purpose)
        if active_previous:
            active_previous.is_used = True
            db.add(active_previous)

        # Save new OTP code
        otp_obj = OtpCode(
            target=target,
            code_hash=code_hash,
            purpose=purpose,
            expires_at=expires_at,
        )
        await otp_repo.create(db, obj_in=otp_obj)
        await db.flush()

        # Send via email or SMS
        if "@" in target:
            send_otp_email(target, code, purpose)
        else:
            send_otp_sms(target, code, purpose)

        return otp_obj

    @staticmethod
    async def verify_otp(db: AsyncSession, target: str, code: str, purpose: str) -> bool:
        """
        Verify the OTP code, enforce retry locking in Redis, and mark the code as used.
        """
        lock_key = f"otp_lock:{target}:{purpose}"
        retry_key = f"otp_retries:{target}:{purpose}"

        if await check_redis_connection():
            # Check lock
            is_locked = await redis_client.get(lock_key)
            if is_locked:
                raise RateLimitError(
                    detail="Too many failed attempts. OTP verification is locked for 15 minutes.",
                    error_code="OTP_LOCKED"
                )

        otp_record = await otp_repo.get_active_otp(db, target, purpose)
        if not otp_record:
            raise ValidationError(detail="No active OTP code found or OTP expired.", error_code="OTP_EXPIRED")

        hashed_attempt = hash_token(code)
        if otp_record.code_hash != hashed_attempt:
            # Handle failure counter
            if await check_redis_connection():
                retries = await redis_client.incr(retry_key)
                if retries == 1:
                    await redis_client.expire(retry_key, 900)  # 15 minutes lifetime
                if retries >= 3:
                    await redis_client.setex(lock_key, 900, "locked")
                    await redis_client.delete(retry_key)
                    raise RateLimitError(
                        detail="Too many failed attempts. OTP verification is locked for 15 minutes.",
                        error_code="OTP_LOCKED"
                    )
            raise ValidationError(detail="Invalid OTP code. Please try again.", error_code="INVALID_OTP")

        # Success - Clear rate-limits and mark OTP as used
        if await check_redis_connection():
            await redis_client.delete(retry_key)
            await redis_client.delete(lock_key)

        otp_record.is_used = True
        db.add(otp_record)
        await db.flush()
        return True

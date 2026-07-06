# Import all the models, so that Base has them before being
# imported by Alembic/env.py
from app.models.base import Base  # noqa
from app.models.user import User  # noqa
from app.models.role import Role  # noqa
from app.models.permission import Permission  # noqa
from app.models.session import Session  # noqa
from app.models.otp import OtpCode  # noqa
from app.models.password_reset import PasswordReset  # noqa
from app.models.email_verification import EmailVerification  # noqa
from app.models.device import Device  # noqa
from app.models.society import Society, SocietySettings  # noqa
from app.models.wing import Wing  # noqa
from app.models.floor import Floor  # noqa
from app.models.flat import Flat  # noqa


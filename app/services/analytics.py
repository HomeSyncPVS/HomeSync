import uuid
from datetime import datetime, timezone
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bill import MaintenanceBill
from app.models.payment import Payment


class AnalyticsService:
    @staticmethod
    async def get_dashboard(db: AsyncSession, society_id: uuid.UUID):
        query = select(MaintenanceBill).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        bills = list(result.scalars().all())

        total_bills = len(bills)
        paid_bills = len([b for b in bills if b.status == "PAID"])
        overdue_bills = len([b for b in bills if b.status == "OVERDUE"])
        total_billed_amount = round(sum(float(b.total_amount) for b in bills), 2)
        total_collected_amount = round(sum(float(b.paid_amount) for b in bills), 2)

        return {
            "total_bills": total_bills,
            "paid_bills": paid_bills,
            "overdue_bills": overdue_bills,
            "total_billed_amount": total_billed_amount,
            "total_collected_amount": total_collected_amount,
            "total_outstanding_amount": round(total_billed_amount - total_collected_amount, 2),
        }

    @staticmethod
    async def get_revenue(db: AsyncSession, society_id: uuid.UUID):
        query = select(Payment).where(
            and_(
                Payment.society_id == society_id,
                Payment.deleted_at.is_(None),
                Payment.status.in_(["SUCCESS", "REFUNDED"]),
                Payment.paid_at.is_not(None),
            )
        )
        result = await db.execute(query)
        payments = list(result.scalars().all())

        grouped = {}
        for payment in payments:
            period = payment.paid_at.strftime("%Y-%m")
            net = float(payment.amount) - float(payment.refunded_amount)
            grouped[period] = grouped.get(period, 0.0) + net

        points = [{"period": k, "revenue": round(v, 2)} for k, v in sorted(grouped.items())]
        return {"points": points}

    @staticmethod
    async def get_payments(db: AsyncSession, society_id: uuid.UUID):
        query = select(Payment).where(
            and_(
                Payment.society_id == society_id,
                Payment.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        payments = list(result.scalars().all())

        by_status = {}
        by_method = {}
        for payment in payments:
            by_status[payment.status] = by_status.get(payment.status, 0) + 1
            by_method[payment.method] = by_method.get(payment.method, 0) + 1

        return {"by_status": by_status, "by_method": by_method}

    @staticmethod
    async def get_collections(db: AsyncSession, society_id: uuid.UUID):
        query = select(MaintenanceBill).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.deleted_at.is_(None),
            )
        )
        result = await db.execute(query)
        bills = list(result.scalars().all())

        billed = round(sum(float(b.total_amount) for b in bills), 2)
        collected = round(sum(float(b.paid_amount) for b in bills), 2)
        rate = round((collected / billed) * 100, 2) if billed > 0 else 0.0

        return {
            "billed_amount": billed,
            "collected_amount": collected,
            "collection_rate": rate,
        }

    @staticmethod
    async def get_outstanding(db: AsyncSession, society_id: uuid.UUID):
        today = datetime.now(timezone.utc).date()
        query = select(MaintenanceBill).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.deleted_at.is_(None),
                MaintenanceBill.total_amount > MaintenanceBill.paid_amount,
            )
        )
        result = await db.execute(query)
        bills = list(result.scalars().all())

        outstanding_amount = round(sum(float(b.total_amount - b.paid_amount) for b in bills), 2)
        overdue_count = len([b for b in bills if b.due_date < today])

        return {
            "outstanding_amount": outstanding_amount,
            "outstanding_count": len(bills),
            "overdue_count": overdue_count,
        }

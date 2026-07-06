import uuid
from typing import List, Dict, Any
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bill import MaintenanceBill
from app.models.payment import Payment
from app.models.flat import Flat
from app.models.wing import Wing
from app.schemas.analytics import (
    DashboardStats,
    AnalyticsRevenueItem,
    AnalyticsPaymentsItem,
    AnalyticsCollectionsItem,
    AnalyticsOutstandingItem
)


class AnalyticsService:
    @staticmethod
    async def get_dashboard_stats(db: AsyncSession, society_id: uuid.UUID) -> DashboardStats:
        # Total bills generated
        q_total_bills = select(func.count(MaintenanceBill.id)).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.deleted_at.is_(None)
            )
        )
        total_bills = await db.scalar(q_total_bills) or 0

        # Total bills paid
        q_paid_bills = select(func.count(MaintenanceBill.id)).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.status == "PAID",
                MaintenanceBill.deleted_at.is_(None)
            )
        )
        paid_bills = await db.scalar(q_paid_bills) or 0

        # Total outstanding amount
        q_outstanding = select(func.sum(MaintenanceBill.outstanding_amount)).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.deleted_at.is_(None)
            )
        )
        outstanding_amt = await db.scalar(q_outstanding) or 0.0

        # Total revenue collected
        q_revenue = select(func.sum(Payment.amount)).where(
            and_(
                Payment.society_id == society_id,
                Payment.status == "COMPLETED",
                Payment.deleted_at.is_(None)
            )
        )
        revenue_collected = await db.scalar(q_revenue) or 0.0

        # Late payments count (Overdue bills)
        q_late = select(func.count(MaintenanceBill.id)).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.status == "OVERDUE",
                MaintenanceBill.deleted_at.is_(None)
            )
        )
        late_payments = await db.scalar(q_late) or 0

        # Total Billed
        q_total_billed = select(func.sum(MaintenanceBill.total_amount)).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.deleted_at.is_(None)
            )
        )
        total_billed = await db.scalar(q_total_billed) or 0.0

        # Collection percentage
        collection_pct = round((revenue_collected / total_billed * 100.0), 2) if total_billed > 0 else 0.0

        return DashboardStats(
            total_bills_generated=total_bills,
            total_bills_paid=paid_bills,
            collection_percentage=collection_pct,
            total_outstanding_amount=outstanding_amt,
            late_payments_count=late_payments,
            total_revenue_collected=revenue_collected
        )

    @staticmethod
    async def get_revenue_analytics(db: AsyncSession, society_id: uuid.UUID) -> List[AnalyticsRevenueItem]:
        query = select(
            func.to_char(Payment.paid_at, "YYYY-MM").label("month"),
            func.sum(Payment.amount).label("revenue")
        ).where(
            and_(
                Payment.society_id == society_id,
                Payment.status == "COMPLETED",
                Payment.deleted_at.is_(None)
            )
        ).group_by("month").order_by("month")

        result = await db.execute(query)
        return [
            AnalyticsRevenueItem(month=row.month, revenue=row.revenue)
            for row in result.all() if row.month is not None
        ]

    @staticmethod
    async def get_payments_analytics(db: AsyncSession, society_id: uuid.UUID) -> List[AnalyticsPaymentsItem]:
        query = select(
            Payment.payment_method.label("method"),
            func.count(Payment.id).label("count"),
            func.sum(Payment.amount).label("amount")
        ).where(
            and_(
                Payment.society_id == society_id,
                Payment.status == "COMPLETED",
                Payment.deleted_at.is_(None)
            )
        ).group_by(Payment.payment_method)

        result = await db.execute(query)
        return [
            AnalyticsPaymentsItem(method=row.method, count=row.count, amount=row.amount)
            for row in result.all()
        ]

    @staticmethod
    async def get_collections_analytics(db: AsyncSession, society_id: uuid.UUID) -> List[AnalyticsCollectionsItem]:
        # Billed amount monthly grouping
        billed_query = select(
            func.to_char(MaintenanceBill.created_at, "YYYY-MM").label("month"),
            func.sum(MaintenanceBill.total_amount).label("billed_amount")
        ).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.deleted_at.is_(None)
            )
        ).group_by("month")
        
        # Collected amount monthly grouping
        collected_query = select(
            func.to_char(Payment.paid_at, "YYYY-MM").label("month"),
            func.sum(Payment.amount).label("collected_amount")
        ).where(
            and_(
                Payment.society_id == society_id,
                Payment.status == "COMPLETED",
                Payment.deleted_at.is_(None)
            )
        ).group_by("month")

        billed_res = await db.execute(billed_query)
        collected_res = await db.execute(collected_query)

        billed_map = {row.month: row.billed_amount for row in billed_res.all() if row.month}
        collected_map = {row.month: row.collected_amount for row in collected_res.all() if row.month}

        all_months = sorted(list(set(list(billed_map.keys()) + list(collected_map.keys()))))
        
        collections = []
        for month in all_months:
            billed = billed_map.get(month, 0.0)
            collected = collected_map.get(month, 0.0)
            pct = round((collected / billed * 100.0), 2) if billed > 0 else 0.0
            collections.append(
                AnalyticsCollectionsItem(
                    month=month,
                    billed_amount=billed,
                    collected_amount=collected,
                    collection_percentage=pct
                )
            )
        return collections

    @staticmethod
    async def get_outstanding_analytics(db: AsyncSession, society_id: uuid.UUID) -> List[AnalyticsOutstandingItem]:
        query = select(
            Wing.name.label("wing_name"),
            func.sum(MaintenanceBill.outstanding_amount).label("outstanding_amount"),
            func.count(func.distinct(Flat.id)).label("flats_count")
        ).join(
            Flat, MaintenanceBill.flat_id == Flat.id
        ).join(
            Wing, Flat.wing_id == Wing.id
        ).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.outstanding_amount > 0,
                MaintenanceBill.deleted_at.is_(None),
                Flat.deleted_at.is_(None),
                Wing.deleted_at.is_(None)
            )
        ).group_by(Wing.name).order_by(Wing.name)

        result = await db.execute(query)
        return [
            AnalyticsOutstandingItem(
                wing_name=row.wing_name,
                outstanding_amount=row.outstanding_amount,
                flats_count=row.flats_count
            )
            for row in result.all()
        ]

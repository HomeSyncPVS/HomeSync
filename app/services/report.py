import csv
import io
import uuid
from typing import List, Tuple
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.models.bill import MaintenanceBill
from app.models.payment import Payment
from app.repositories.bill import BillRepository
from app.repositories.payment import PaymentRepository

bill_repo = BillRepository()
payment_repo = PaymentRepository()


class ReportService:
    @staticmethod
    async def _get_bills(db: AsyncSession, society_id: uuid.UUID) -> List[MaintenanceBill]:
        query = (
            select(MaintenanceBill)
            .where(
                and_(
                    MaintenanceBill.society_id == society_id,
                    MaintenanceBill.deleted_at.is_(None),
                )
            )
            .options(selectinload(MaintenanceBill.items))
            .order_by(MaintenanceBill.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def _get_payments(db: AsyncSession, society_id: uuid.UUID) -> List[Payment]:
        return await payment_repo.get_multi_active(db, society_id=society_id, skip=0, limit=10000)

    @staticmethod
    async def get_billing_report(db: AsyncSession, society_id: uuid.UUID):
        bills = await ReportService._get_bills(db, society_id)
        rows = []
        total_billed = 0.0
        total_collected = 0.0
        total_late_fee = 0.0
        for bill in bills:
            outstanding = round(bill.total_amount - bill.paid_amount, 2)
            rows.append(
                {
                    "bill_number": bill.bill_number,
                    "billing_period": bill.billing_period,
                    "issue_date": bill.issue_date,
                    "due_date": bill.due_date,
                    "total_amount": bill.total_amount,
                    "paid_amount": bill.paid_amount,
                    "outstanding_amount": outstanding,
                    "status": bill.status,
                }
            )
            total_billed += float(bill.total_amount)
            total_collected += float(bill.paid_amount)
            total_late_fee += float(bill.late_fee_amount)

        summary = {
            "total_billed": round(total_billed, 2),
            "total_collected": round(total_collected, 2),
            "total_outstanding": round(total_billed - total_collected, 2),
            "total_late_fee": round(total_late_fee, 2),
        }
        return {"summary": summary, "rows": rows}

    @staticmethod
    async def get_payment_report(db: AsyncSession, society_id: uuid.UUID):
        payments = await ReportService._get_payments(db, society_id)
        bill_ids = list({payment.bill_id for payment in payments})
        bill_number_map = {}
        if bill_ids:
            bill_query = select(MaintenanceBill.id, MaintenanceBill.bill_number).where(
                MaintenanceBill.id.in_(bill_ids)
            )
            bill_result = await db.execute(bill_query)
            bill_number_map = {row[0]: row[1] for row in bill_result.all()}

        rows = []
        for payment in payments:
            rows.append(
                {
                    "payment_id": str(payment.id),
                    "bill_number": bill_number_map.get(payment.bill_id, ""),
                    "method": payment.method,
                    "amount": float(payment.amount),
                    "status": payment.status,
                    "paid_at": payment.paid_at.isoformat() if payment.paid_at else "",
                }
            )
        return {"count": len(rows), "rows": rows}

    @staticmethod
    async def get_revenue_report(db: AsyncSession, society_id: uuid.UUID):
        payments = await ReportService._get_payments(db, society_id)
        grouped = {}
        for payment in payments:
            if not payment.paid_at or payment.status not in ["SUCCESS", "REFUNDED"]:
                continue
            period = payment.paid_at.strftime("%Y-%m")
            net = float(payment.amount) - float(payment.refunded_amount)
            grouped[period] = grouped.get(period, 0.0) + net

        rows = [{"period": k, "revenue": round(v, 2)} for k, v in sorted(grouped.items())]
        return {"count": len(rows), "rows": rows}

    @staticmethod
    async def get_outstanding_report(db: AsyncSession, society_id: uuid.UUID):
        bills = await bill_repo.get_outstanding(db, society_id=society_id)
        rows = []
        for bill in bills:
            outstanding = round(bill.total_amount - bill.paid_amount, 2)
            rows.append(
                {
                    "bill_number": bill.bill_number,
                    "due_date": bill.due_date,
                    "total_amount": bill.total_amount,
                    "paid_amount": bill.paid_amount,
                    "outstanding_amount": outstanding,
                    "status": bill.status,
                }
            )
        return {"count": len(rows), "rows": rows}

    @staticmethod
    async def export_csv(db: AsyncSession, society_id: uuid.UUID) -> str:
        report = await ReportService.get_billing_report(db, society_id)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["bill_number", "billing_period", "issue_date", "due_date", "total_amount", "paid_amount", "outstanding_amount", "status"])
        for row in report["rows"]:
            writer.writerow([
                row["bill_number"],
                row["billing_period"],
                row["issue_date"],
                row["due_date"],
                row["total_amount"],
                row["paid_amount"],
                row["outstanding_amount"],
                row["status"],
            ])
        return output.getvalue()

    @staticmethod
    async def export_excel(db: AsyncSession, society_id: uuid.UUID) -> bytes:
        report = await ReportService.get_billing_report(db, society_id)
        wb = Workbook()
        ws = wb.active
        ws.title = "Billing"

        ws.append(["Bill Number", "Period", "Issue Date", "Due Date", "Total", "Paid", "Outstanding", "Status"])
        for row in report["rows"]:
            ws.append([
                row["bill_number"],
                row["billing_period"],
                str(row["issue_date"]),
                str(row["due_date"]),
                row["total_amount"],
                row["paid_amount"],
                row["outstanding_amount"],
                row["status"],
            ])

        stream = io.BytesIO()
        wb.save(stream)
        return stream.getvalue()

    @staticmethod
    async def export_pdf(db: AsyncSession, society_id: uuid.UUID) -> bytes:
        report = await ReportService.get_billing_report(db, society_id)
        stream = io.BytesIO()
        pdf = canvas.Canvas(stream, pagesize=A4)

        y = 285 * mm
        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(20 * mm, y, "HomeSync Billing Report")
        y -= 10 * mm

        pdf.setFont("Helvetica", 10)
        for row in report["rows"]:
            line = (
                f"{row['bill_number']} | {row['billing_period']} | Due: {row['due_date']} | "
                f"Total: {row['total_amount']:.2f} | Paid: {row['paid_amount']:.2f} | Status: {row['status']}"
            )
            pdf.drawString(20 * mm, y, line)
            y -= 7 * mm
            if y < 20 * mm:
                pdf.showPage()
                y = 285 * mm
                pdf.setFont("Helvetica", 10)

        pdf.showPage()
        pdf.save()
        return stream.getvalue()

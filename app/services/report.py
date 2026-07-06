import uuid
import csv
from io import BytesIO, StringIO
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

from app.models.bill import MaintenanceBill, BillItem
from app.models.payment import Payment
from app.models.flat import Flat
from app.models.wing import Wing
from app.models.society import Society
from app.schemas.report import (
    BillingReportItem,
    PaymentReportItem,
    OutstandingReportItem,
    RevenueReportItem
)


class ReportService:
    @staticmethod
    async def get_billing_report(db: AsyncSession, society_id: uuid.UUID) -> List[BillingReportItem]:
        query = select(
            MaintenanceBill.id,
            MaintenanceBill.bill_number,
            Society.name.label("society_name"),
            Flat.flat_number,
            Wing.name.label("wing_name"),
            MaintenanceBill.bill_type,
            MaintenanceBill.status,
            MaintenanceBill.total_amount,
            MaintenanceBill.outstanding_amount,
            MaintenanceBill.due_date
        ).join(
            Society, MaintenanceBill.society_id == Society.id
        ).join(
            Flat, MaintenanceBill.flat_id == Flat.id
        ).join(
            Wing, Flat.wing_id == Wing.id
        ).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.deleted_at.is_(None)
            )
        ).order_by(MaintenanceBill.created_at.desc())

        result = await db.execute(query)
        rows = result.all()
        return [
            BillingReportItem(
                bill_id=row.id,
                bill_number=row.bill_number,
                society_name=row.society_name,
                flat_number=row.flat_number,
                wing_name=row.wing_name,
                bill_type=row.bill_type,
                status=row.status,
                total_amount=row.total_amount,
                outstanding_amount=row.outstanding_amount,
                due_date=row.due_date
            )
            for row in rows
        ]

    @staticmethod
    async def get_payment_report(db: AsyncSession, society_id: uuid.UUID) -> List[PaymentReportItem]:
        query = select(
            Payment.id,
            Payment.payment_number,
            MaintenanceBill.bill_number,
            Flat.flat_number,
            Wing.name.label("wing_name"),
            Payment.amount,
            Payment.payment_method,
            Payment.status,
            Payment.transaction_reference,
            Payment.paid_at
        ).join(
            Flat, Payment.flat_id == Flat.id
        ).join(
            Wing, Flat.wing_id == Wing.id
        ).outerjoin(
            MaintenanceBill, Payment.bill_id == MaintenanceBill.id
        ).where(
            and_(
                Payment.society_id == society_id,
                Payment.deleted_at.is_(None)
            )
        ).order_by(Payment.created_at.desc())

        result = await db.execute(query)
        rows = result.all()
        return [
            PaymentReportItem(
                payment_id=row.id,
                payment_number=row.payment_number,
                bill_number=row.bill_number,
                flat_number=row.flat_number,
                wing_name=row.wing_name,
                amount=row.amount,
                payment_method=row.payment_method,
                status=row.status,
                transaction_reference=row.transaction_reference,
                paid_at=row.paid_at
            )
            for row in rows
        ]

    @staticmethod
    async def get_outstanding_report(db: AsyncSession, society_id: uuid.UUID) -> List[OutstandingReportItem]:
        query = select(
            Flat.id,
            Flat.flat_number,
            Wing.name.label("wing_name"),
            func.sum(MaintenanceBill.outstanding_amount).label("total_outstanding"),
            func.count(MaintenanceBill.id).label("overdue_bills_count")
        ).join(
            Wing, Flat.wing_id == Wing.id
        ).join(
            MaintenanceBill, MaintenanceBill.flat_id == Flat.id
        ).where(
            and_(
                Flat.society_id == society_id,
                MaintenanceBill.outstanding_amount > 0,
                MaintenanceBill.deleted_at.is_(None),
                Flat.deleted_at.is_(None)
            )
        ).group_by(
            Flat.id, Flat.flat_number, Wing.name
        ).order_by(
            func.sum(MaintenanceBill.outstanding_amount).desc()
        )

        result = await db.execute(query)
        rows = result.all()
        return [
            OutstandingReportItem(
                flat_id=row.id,
                flat_number=row.flat_number,
                wing_name=row.wing_name,
                total_outstanding=row.total_outstanding,
                overdue_bills_count=row.overdue_bills_count
            )
            for row in rows
        ]

    @staticmethod
    async def get_revenue_report(db: AsyncSession, society_id: uuid.UUID) -> List[RevenueReportItem]:
        # Billed amount monthly grouping
        billed_query = select(
            func.to_char(MaintenanceBill.created_at, "YYYY-MM").label("period"),
            func.sum(MaintenanceBill.total_amount).label("total_billed")
        ).where(
            and_(
                MaintenanceBill.society_id == society_id,
                MaintenanceBill.deleted_at.is_(None)
            )
        ).group_by("period")
        
        # Collected amount monthly grouping
        collected_query = select(
            func.to_char(Payment.paid_at, "YYYY-MM").label("period"),
            func.sum(Payment.amount).label("total_collected")
        ).where(
            and_(
                Payment.society_id == society_id,
                Payment.status == "COMPLETED",
                Payment.deleted_at.is_(None)
            )
        ).group_by("period")

        billed_res = await db.execute(billed_query)
        collected_res = await db.execute(collected_query)

        billed_map = {row.period: row.total_billed for row in billed_res.all()}
        collected_map = {row.period: row.total_collected for row in collected_res.all()}

        all_periods = sorted(list(set(list(billed_map.keys()) + list(collected_map.keys()))), reverse=True)
        
        report_items = []
        for period in all_periods:
            billed = billed_map.get(period, 0.0)
            collected = collected_map.get(period, 0.0)
            rate = round((collected / billed * 100.0), 2) if billed > 0 else 0.0
            report_items.append(
                RevenueReportItem(
                    period=period,
                    total_billed=billed,
                    total_collected=collected,
                    collection_rate=rate
                )
            )
        return report_items

    @staticmethod
    async def export_pdf(db: AsyncSession, society_id: uuid.UUID) -> bytes:
        society = await db.scalar(select(Society).where(Society.id == society_id))
        society_name = society.name if society else "HomeSync"
        
        bills = await ReportService.get_billing_report(db, society_id)

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()

        story.append(Paragraph(f"<b>{society_name}</b>", styles["Title"]))
        story.append(Spacer(1, 15))
        story.append(Paragraph("<b>Society Billing Report Summary</b>", styles["Heading2"]))
        story.append(Spacer(1, 15))

        table_data = [["Bill Number", "Flat", "Type", "Status", "Amount (INR)", "Due Date"]]
        for b in bills:
            table_data.append([
                b.bill_number,
                f"{b.wing_name}-{b.flat_number}",
                b.bill_type,
                b.status,
                f"{b.total_amount:,.2f}",
                b.due_date.strftime("%Y-%m-%d")
            ])

        table = Table(table_data, colWidths=[100, 70, 70, 70, 90, 80])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.whitesmoke),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
        ]))
        
        story.append(table)
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    async def export_excel(db: AsyncSession, society_id: uuid.UUID) -> bytes:
        bills = await ReportService.get_billing_report(db, society_id)
        
        wb = Workbook()
        ws = wb.active
        ws.title = "Billing Report"
        
        ws.append(["Bill Number", "Society Name", "Flat Number", "Wing", "Bill Type", "Status", "Total Amount", "Outstanding", "Due Date"])
        for b in bills:
            ws.append([
                b.bill_number,
                b.society_name,
                b.flat_number,
                b.wing_name,
                b.bill_type,
                b.status,
                b.total_amount,
                b.outstanding_amount,
                b.due_date.strftime("%Y-%m-%d")
            ])
            
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    async def export_csv(db: AsyncSession, society_id: uuid.UUID) -> str:
        bills = await ReportService.get_billing_report(db, society_id)
        
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(["Bill Number", "Society Name", "Flat Number", "Wing", "Bill Type", "Status", "Total Amount", "Outstanding", "Due Date"])
        for b in bills:
            writer.writerow([
                b.bill_number,
                b.society_name,
                b.flat_number,
                b.wing_name,
                b.bill_type,
                b.status,
                b.total_amount,
                b.outstanding_amount,
                b.due_date.strftime("%Y-%m-%d")
            ])
        return output.getvalue()

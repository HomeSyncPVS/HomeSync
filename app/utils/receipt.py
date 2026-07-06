from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors


def generate_receipt_pdf_bytes(
    receipt_number: str,
    amount: float,
    date_str: str,
    flat_num: str,
    bill_num: str,
    society_name: str
) -> bytes:
    """
    Generates a valid, formatted PDF receipt using reportlab.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    # Title / Header
    story.append(Paragraph(f"<b>{society_name}</b>", styles["Title"]))
    story.append(Spacer(1, 15))
    story.append(Paragraph("<b>MAINTENANCE PAYMENT RECEIPT</b>", styles["Heading2"]))
    story.append(Spacer(1, 15))

    # Receipt Metadata Table
    data = [
        ["Receipt Number:", receipt_number],
        ["Associated Bill:", bill_num or "N/A"],
        ["Flat Number:", flat_num],
        ["Amount Paid:", f"INR {amount:,.2f}"],
        ["Payment Date:", date_str],
        ["Status:", "COMPLETED"]
    ]
    
    table = Table(data, colWidths=[150, 300])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    
    story.append(table)
    story.append(Spacer(1, 30))
    story.append(Paragraph("Thank you for your payment. This is a computer-generated receipt.", styles["Normal"]))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

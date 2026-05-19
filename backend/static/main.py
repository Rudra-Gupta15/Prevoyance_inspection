
from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
import os
import json
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "*"]  # frontend URL
)

REPORT_DIR = "reports"
os.makedirs(REPORT_DIR, exist_ok=True)

class AuditData(BaseModel):
    computer_name: str
    os_name: str
    os_version: str
    architecture: str
    antivirus: str
    mac_address: str
    printers: list
    hotfixes: list

@app.get("/")
def home():
    return {"message": "Audit API Running"}

@app.post("/upload-audit")
def upload_audit(data: AuditData):

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    json_path = f"{REPORT_DIR}/audit_{timestamp}.json"
    pdf_path = f"{REPORT_DIR}/audit_{timestamp}.pdf"

    # Save JSON
    with open(json_path, "w") as f:
        json.dump(data.dict(), f, indent=4)

    # Generate PDF
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    styles = getSampleStyleSheet()

    elements = []

    elements.append(Paragraph("Windows Audit Report", styles['Title']))
    elements.append(Spacer(1, 20))

    elements.append(Paragraph(f"Computer Name: {data.computer_name}", styles['BodyText']))
    elements.append(Paragraph(f"OS Name: {data.os_name}", styles['BodyText']))
    elements.append(Paragraph(f"OS Version: {data.os_version}", styles['BodyText']))
    elements.append(Paragraph(f"Architecture: {data.architecture}", styles['BodyText']))
    elements.append(Paragraph(f"Antivirus: {data.antivirus}", styles['BodyText']))
    elements.append(Paragraph(f"MAC Address: {data.mac_address}", styles['BodyText']))

    elements.append(Spacer(1, 15))

    elements.append(Paragraph("Installed Printers:", styles['Heading2']))

    for printer in data.printers:
        elements.append(Paragraph(printer, styles['BodyText']))

    elements.append(Spacer(1, 15))

    elements.append(Paragraph("Installed Hotfixes:", styles['Heading2']))

    for fix in data.hotfixes:
        elements.append(Paragraph(fix, styles['BodyText']))

    doc.build(elements)

    return {
        "status": "success",
        "pdf": pdf_path,
        "json": json_path
    }

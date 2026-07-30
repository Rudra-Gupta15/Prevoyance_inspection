# 🛡️ InfraPulse — Automated IT Compliance & Asset Inspection Portal

> **Developed by Prevoyance IT Solutions**  
> *A full-stack, enterprise-grade IT compliance auditing and asset management platform. Discovers, inspects, and generates structured compliance reports for Windows, macOS, and Linux workstations across local networks and remote internet locations — with zero manual configuration.*

---

## 📋 Table of Contents

1. [Project Name](#-project-name)
2. [Overview](#-overview)
3. [Problem Statement](#-problem-statement)
4. [Key Features](#-key-features)
5. [Tech Stack](#-tech-stack)
6. [Installation & Execution Guide (Step-by-Step for All 3 OS)](#-installation--execution-guide-step-by-step-for-all-3-os)
   - [Windows (.exe / .vbs)](#1-windows-setup--execution-exe--vbs)
   - [macOS (.command)](#2-macos-setup--execution-command)
   - [Linux (.sh)](#3-linux-setup--execution-sh)
7. [User Guide (How to Use the Portal)](#-user-guide-how-to-use-the-portal)
8. [Important Testing Note](#-testing-note)

---

## 🏷️ Project Name

**InfraPulse: Enterprise IT Compliance Audit & Asset Inspection System**  
*Product by:* **Prevoyance IT Solutions**

---

## 🌐 Overview

The **InfraPulse IT Compliance Portal** is a centralized, self-hosted audit solution engineered by **Prevoyance IT Solutions**. It automates system inventory collection, hardware verification, software auditing, security policy inspection, and compliance report generation across all workstation operating systems (Windows, macOS, Linux).

Whether laptops are connected on the same local Wi-Fi router or operating remotely from home offices across different cities, InfraPulse allows IT administrators and auditors to gather instant, tamper-proof hardware/software inspection reports in seconds.

---

## 🎯 Problem Statement

Traditional IT compliance audits at branch offices and corporate workstations face major operational hurdles:

1. **Time-Consuming Manual Audits**: IT engineers have to physically log into every employee laptop, run commands, check control panel software, and write manual Excel reports.
2. **Remote & Work-From-Home Invisibility**: Laptops operating outside the local office network or on different Wi-Fi routers cannot be scanned using standard local IP range tools.
3. **Complex Terminal Commands for Non-Technical Staff**: Employees are reluctant or unable to open PowerShell/Terminal to run raw CLI commands.
4. **Data Security & Link Exposure**: Standard audit scripts expose backend IP addresses and sensitive API endpoints in plain text inside terminals or browsers.
5. **Lack of Automated Change Tracking**: Difficulty in identifying when an employee installs unauthorized software or replaces a RAM module/hard drive between quarterly audits.

**InfraPulse solves every single one of these problems with 1-click double-clickable launchers, Base64 stealth obfuscation, multi-OS support, real-time cloud tunnels, and automated PDF compliance reports.**

---

## 🚀 Key Features

* 🪟 🍎 🐧 **Cross-Platform Support**: Seamlessly audits **Windows 10/11**, **macOS (Intel & Apple Silicon)**, and **Linux (Ubuntu, Debian, RHEL, WSL)**.
* 🖱️ **1-Click Native Executable Launchers**: Downloadable double-clickable files (**`.exe`** for Windows, **`.command`** for macOS Finder, **`.sh`** for Linux Desktop) so users never have to touch a terminal.
* 🔒 **Stealth Base64 Command Obfuscation**: Terminal deployment one-liners hide all URLs and API endpoints. Direct browser access is automatically blocked (`404 Not Found`).
* 📄 **Automated PDF & XML Compliance Reports**: Generates professional, branded PDF inspection reports containing hardware specs, software inventory, hotfixes, antivirus status, and login history.
* 🔍 **Smart Network Scanner Engine**: Parallel ICMP Ping Sweep (128 threads), TCP Port Scanning (64 threads), and ARP discovery for subnet device identification.
* 📊 **Software & Hardware Delta Diff Engine**: Automatically compares consecutive scans of the same laptop to highlight newly installed software, removed apps, and hardware modifications.
* 📡 **WiFi Dashboard & Metrics**: Real-time signal strength analysis and indoor router distance estimation using RSSI log-distance path loss modeling.

---

## 🛠️ Tech Stack

| Layer | Technologies Used | Purpose |
|---|---|---|
| **Backend Core** | Python 3.10+ / FastAPI / Uvicorn | High-performance async REST API & ingestion server |
| **Frontend UI** | HTML5, Vanilla CSS3 (Custom Glassmorphism), Modern ES6 JS | Rich single-page dashboard with zero heavy external dependencies |
| **Database** | SQLite3 + WAL Mode | Lightweight, real-time relational storage for device audits |
| **Report Generator** | ReportLab PDF Engine | Automated PDF audit report generation |
| **Windows Executable Compiler** | Microsoft C# Compiler (`csc.exe`) / PowerShell VBS | Dynamic `.exe` and `.vbs` binary launcher generator |
| **Unix Engine** | POSIX Shell (`bash`) / Python3 Fallback | Agentless macOS and Linux data collection script |
| **Network & Security** | `socket`, `subprocess`, Base64, WinHTTP CLI | Subnet scanning, ARP parsing, and obfuscated communication |

---

## 💻 Installation & Execution Guide (Step-by-Step for All 3 OS)

### 1. Windows Setup & Execution (`.exe` / `.vbs`)

#### **Method A: 1-Click Binary Executable (`.exe`) — Recommended**
1. On the target Windows laptop, open the portal and navigate to the **Terminal Command** tab.
2. Click **`🪟 Windows Binary (.exe Launcher)`** to download `RunAudit_Windows.exe`.
3. Open your **Downloads** folder and **double-click `RunAudit_Windows.exe`**.
4. The audit will run **silently in the background** with zero terminal windows popping up. The report will appear on the dashboard within 10 seconds.

#### **Method B: Stealth Terminal Command**
1. Copy the obfuscated 1-click command from the portal dashboard:
   ```powershell
   powershell -c "[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('...')) | iex"
   ```
2. Open **PowerShell** on the target laptop, paste the command, and press **Enter**.

---

### 2. macOS Setup & Execution (`.command`)

#### **Method A: Double-Clickable Finder Launcher (`.command`)**
1. Open the portal dashboard and click **`🍎 macOS Launcher (.command)`** to download `RunAudit_Mac.command`.
2. Open Finder $\rightarrow$ **Downloads** folder.
3. **Double-click** `RunAudit_Mac.command`.  
   *(Note: If macOS displays a security prompt, Right-Click the file $\rightarrow$ select **Open** $\rightarrow$ click **Open**).*

#### **Method B: Terminal Command**
1. Copy the macOS command from the portal dashboard:
   ```bash
   curl -sSL "https://<your-portal-domain>/sys-agent-mac?client_id=mac_01" | bash
   ```
2. Open **Terminal** on macOS, paste the line, and press **Enter**.

---

### 3. Linux Setup & Execution (`.sh`)

#### **Method A: Double-Clickable Shell Launcher (`.sh`)**
1. Click **`🐧 Linux Launcher (.sh)`** on the dashboard to download `RunAudit_Linux.sh`.
2. Open terminal in Downloads folder and grant execution permission:
   ```bash
   chmod +x RunAudit_Linux.sh
   ```
3. Run the script:
   ```bash
   ./RunAudit_Linux.sh
   ```

#### **Method B: 1-Line Bash Execution**
```bash
curl -sSL "https://<your-portal-domain>/sys-agent-mac?client_id=linux_01" | bash
```

---

## 📖 User Guide (How to Use the Portal)

1. **Launch the Central Portal Server**:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **Access Dashboard**: Open `http://localhost:8000` (or your assigned Cloudflare Tunnel URL) in any web browser.
3. **Perform Audits**:
   - Navigate to the **Terminal Command** tab.
   - Select your deployment mode (Local Wi-Fi or Remote Internet).
   - Download the appropriate OS launcher (`.exe`, `.command`, or `.sh`) or copy the obfuscated command.
   - Run the launcher on the target workstation.
4. **View Compliance Inspection Reports**:
   - Go to **Device Audits** or **All Devices** on the left sidebar.
   - Select the audited laptop from the dropdown menu to inspect system hardware specs, motherboard details, installed software list, recent logins, and GPU details.
   - Click **Download PDF Report** to save or print the official compliance document.

---

## 📝 Testing Note

> [!NOTE]
> **Cloudflare Tunnel Access Provided by Prevoyance IT Solutions**  
> Whenever you test the portal or audit laptops across different Wi-Fi networks / remote home locations, **Prevoyance IT Solutions** will provide a live, pre-configured **Cloudflare Tunnel URL** (e.g., `https://xxxx.trycloudflare.com`).  
> 
> Simply enter this provided Cloudflare link into Section 3 of your dashboard, and all generated commands & double-clickable launchers will work over HTTPS across any laptop worldwide without requiring router port forwarding or manual IP setup.

---

*© Prevoyance IT Solutions. All rights reserved.*

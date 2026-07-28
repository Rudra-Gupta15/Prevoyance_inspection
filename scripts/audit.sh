#!/bin/bash
# ==============================================================================
#        NSDL WORKSTATION COMPLIANCE AUDIT SCRIPT (macOS / Linux)
# ==============================================================================
# Version: 3.0.0 — Full IT Asset Management Edition

echo "Collecting Workstation Compliance Data..."

EXECUTION_DATETIME=$(date +"%Y-%m-%d %H:%M:%S")
CONSENT_TEXT="We provide approval to NSDL e-Governance Infrastructure Ltd.(NSDL e-Gov) to capture the details regarding the System details and share the details with NSDL e-Gov."
COMPUTER_NAME=$(hostname)

# ── OS Detection ──────────────────────────────────────────────────────────────
OS_NAME=$(uname -s)
ARCHITECTURE=$(uname -m)
OS_VERSION=$(uname -r)

if [ "$OS_NAME" = "Darwin" ]; then
    OS_NAME="macOS"
    if command -v sw_vers >/dev/null 2>&1; then
        OS_VERSION=$(sw_vers -productVersion)
    fi
elif [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME="${NAME:-$OS_NAME}"
    OS_VERSION="${VERSION_ID:-$OS_VERSION}"
fi

LICENSE_STATUS="Not Applicable"
DESCRIPTION="Unix Workstation ($OS_NAME)"
DOMAIN="LOCAL"
DOMAIN_ROLE="Standalone Workstation"
SHUTDOWN_TIME="N/A"
LAST_BACKUP="TimeMachine / System Backup Active"
LIFE_CYCLE="Active"

# Extract shutdown time if available
if command -v last >/dev/null 2>&1; then
    SHUTDOWN_TIME=$(last -x shutdown 2>/dev/null | head -1 | awk '{print $4" "$5" "$6" "$7}')
    [ -z "$SHUTDOWN_TIME" ] && SHUTDOWN_TIME="N/A"
fi

# Check if python3 is usable without triggering xcode-select installer
# On macOS without Xcode CLT, invoking python3 pops up an install dialog
PYTHON3_OK=false
if command -v python3 >/dev/null 2>&1; then
    # Test silently — xcode-select errors go to stderr, suppress them
    if python3 -c "import sys; sys.exit(0)" >/dev/null 2>&1; then
        PYTHON3_OK=true
    fi
fi

# ── MAC Address ───────────────────────────────────────────────────────────────
MAC_ADDRESS="Unknown"
if command -v ifconfig >/dev/null 2>&1; then
    MAC_ADDRESS=$(ifconfig | grep -v '00:00:00:00:00:00' | grep -oE '([[:xdigit:]]{1,2}:){5}[[:xdigit:]]{1,2}' | head -n 1 | tr -d ':' | tr '[:lower:]' '[:upper:]')
elif command -v ip >/dev/null 2>&1; then
    MAC_ADDRESS=$(ip link | grep -v '00:00:00:00:00:00' | grep -oE '([[:xdigit:]]{1,2}:){5}[[:xdigit:]]{1,2}' | head -n 1 | tr -d ':' | tr '[:lower:]' '[:upper:]')
fi
[ -z "$MAC_ADDRESS" ] && MAC_ADDRESS="Unknown"

DRIVE_NAME="No CD Unit Found"
COMPRESSION_UTILITIES='["tar", "gzip", "zip (built-in)"]'
ANTIVIRUS='["Built-in OS Protections"]'
PRINTERS=$(python3 - 2>/dev/null <<'PYEOF'
import subprocess, json, re
printers = []
try:
    r = subprocess.run(['lpstat', '-p'], capture_output=True, text=True, timeout=10)
    for line in r.stdout.split('\n'):
        if line.startswith('printer '):
            parts = line.split(' ')
            name = parts[1]
            status = ' '.join(parts[2:]).split('.')[0] if len(parts) > 2 else "Unknown"
            printers.append({
                "name": name,
                "port_name": "Unknown",
                "driver_name": "Unknown",
                "printer_status": status.strip(),
                "extended_printer_status": "0"
            })
except Exception:
    pass
print(json.dumps(printers))
PYEOF
)
if [ -z "$PRINTERS" ] || [ "$PRINTERS" = "null" ]; then
    PRINTERS="[]"
fi


# ── Basic Hardware: CPU, RAM, Disk ────────────────────────────────────────────
CPU="Unknown"
RAM="Unknown"
DISK="Unknown"

if [ "$OS_NAME" = "macOS" ]; then
    if command -v sysctl >/dev/null 2>&1; then
        CPU=$(sysctl -n machdep.cpu.brand_string 2>/dev/null)
        RAM_BYTES=$(sysctl -n hw.memsize 2>/dev/null)
        if [ -n "$RAM_BYTES" ]; then
            RAM_GB=$(awk "BEGIN {printf \"%.2f\", $RAM_BYTES / 1073741824}")
            RAM="${RAM_GB} GB"
        fi
    fi
    DISK=$(df -h / | tail -1 | awk '{print $1 " " $4 " free of " $2}')
else
    if command -v lscpu >/dev/null 2>&1; then
        CPU=$(lscpu | grep 'Model name' | cut -f 2 -d ":" | awk '{$1=$1}1')
    fi
    if command -v free >/dev/null 2>&1; then
        RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
        if [ -n "$RAM_MB" ]; then
            RAM_GB=$(awk "BEGIN {printf \"%.2f\", $RAM_MB / 1024}")
            RAM="${RAM_GB} GB"
        fi
    fi
    DISK=$(df -h / | tail -1 | awk '{print $1 " " $4 " free of " $2}')
fi

# ── Network Details ───────────────────────────────────────────────────────────
IP_ADDRESS="Unknown"
if command -v hostname >/dev/null 2>&1; then
    IP_ADDRESS=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
if [ -z "$IP_ADDRESS" ] && command -v ifconfig >/dev/null 2>&1; then
    IP_ADDRESS=$(ifconfig 2>/dev/null | awk '/inet / && !/127.0.0.1/{print $2}' | head -n 1)
fi
[ -z "$IP_ADDRESS" ] && IP_ADDRESS="Unknown"

NETWORK_DETAILS="[{\"ip_address\": \"$IP_ADDRESS\", \"gateway\": \"Unknown\", \"mac\": \"$MAC_ADDRESS\"}]"
USER_ACCOUNTS="[{\"name\": \"$USER\", \"disabled\": \"False\"}]"

# ────────────────────────────────────────────────────────────────────────────
#  PHASE 1 — EXTENDED HARDWARE COLLECTION
# ────────────────────────────────────────────────────────────────────────────
echo "Collecting extended hardware info..."

# Serial Number, Manufacturer, Model, Motherboard, BIOS
SERIAL_NUMBER="Unknown"
MANUFACTURER="Unknown"
MODEL_NAME="Unknown"
MOBO_MANUFACTURER="Unknown"
MOBO_PRODUCT="Unknown"
MOBO_VERSION="Unknown"
MOBO_SERIAL="Unknown"
BIOS_VERSION="Unknown"
BIOS_DATE="Unknown"

if [ "$OS_NAME" = "macOS" ]; then
    SERIAL_NUMBER=$(system_profiler SPHardwareDataType 2>/dev/null | awk -F': ' '/Serial Number \(system\)/{print $2}' | head -1 | sed 's/^ *//')
    MANUFACTURER="Apple Inc."
    MODEL_NAME=$(system_profiler SPHardwareDataType 2>/dev/null | awk -F': ' '/Model Name/{print $2}' | head -1 | sed 's/^ *//')
    MOBO_MANUFACTURER="Apple Inc."
    MOBO_PRODUCT=$(system_profiler SPHardwareDataType 2>/dev/null | awk -F': ' '/Model Identifier/{print $2}' | head -1 | sed 's/^ *//')
    BIOS_VERSION=$(system_profiler SPHardwareDataType 2>/dev/null | awk -F': ' '/Boot ROM Version/{print $2}' | head -1 | sed 's/^ *//')
    [ -z "$SERIAL_NUMBER" ] && SERIAL_NUMBER="Unknown"
    [ -z "$MODEL_NAME" ]    && MODEL_NAME="Unknown"
else
    # Try sysfs dmi first (world-readable on Linux without root!)
    if [ -d /sys/class/dmi/id ]; then
        [ -f /sys/class/dmi/id/product_serial ] && SERIAL_NUMBER=$(cat /sys/class/dmi/id/product_serial 2>/dev/null | tr -d '\0\r\n')
        [ -f /sys/class/dmi/id/sys_vendor ]     && MANUFACTURER=$(cat /sys/class/dmi/id/sys_vendor 2>/dev/null | tr -d '\0\r\n')
        [ -f /sys/class/dmi/id/product_name ]   && MODEL_NAME=$(cat /sys/class/dmi/id/product_name 2>/dev/null | tr -d '\0\r\n')
        [ -f /sys/class/dmi/id/board_vendor ]   && MOBO_MANUFACTURER=$(cat /sys/class/dmi/id/board_vendor 2>/dev/null | tr -d '\0\r\n')
        [ -f /sys/class/dmi/id/board_name ]     && MOBO_PRODUCT=$(cat /sys/class/dmi/id/board_name 2>/dev/null | tr -d '\0\r\n')
        [ -f /sys/class/dmi/id/board_version ]  && MOBO_VERSION=$(cat /sys/class/dmi/id/board_version 2>/dev/null | tr -d '\0\r\n')
        [ -f /sys/class/dmi/id/board_serial ]   && MOBO_SERIAL=$(cat /sys/class/dmi/id/board_serial 2>/dev/null | tr -d '\0\r\n')
        [ -f /sys/class/dmi/id/bios_version ]   && BIOS_VERSION=$(cat /sys/class/dmi/id/bios_version 2>/dev/null | tr -d '\0\r\n')
        [ -f /sys/class/dmi/id/bios_date ]      && BIOS_DATE=$(cat /sys/class/dmi/id/bios_date 2>/dev/null | tr -d '\0\r\n')
    fi
    
    # Fallback to dmidecode if sysfs values were empty/Unknown
    if command -v dmidecode >/dev/null 2>&1; then
        { [ "$SERIAL_NUMBER" = "Unknown" ] || [ -z "$SERIAL_NUMBER" ]; } && SERIAL_NUMBER=$(dmidecode -s system-serial-number 2>/dev/null | head -1)
        { [ "$MANUFACTURER" = "Unknown" ] || [ -z "$MANUFACTURER" ]; } && MANUFACTURER=$(dmidecode -s system-manufacturer 2>/dev/null | head -1)
        { [ "$MODEL_NAME" = "Unknown" ] || [ -z "$MODEL_NAME" ]; } && MODEL_NAME=$(dmidecode -s system-product-name 2>/dev/null | head -1)
    fi
fi

SERIAL_NUMBER=$(echo "$SERIAL_NUMBER" | sed 's/"/\\"/g')
MANUFACTURER=$(echo "$MANUFACTURER"  | sed 's/"/\\"/g')
MODEL_NAME=$(echo "$MODEL_NAME"      | sed 's/"/\\"/g')
MOBO_MANUFACTURER=$(echo "$MOBO_MANUFACTURER" | sed 's/"/\\"/g')
MOBO_PRODUCT=$(echo "$MOBO_PRODUCT" | sed 's/"/\\"/g')
MOBO_VERSION=$(echo "$MOBO_VERSION" | sed 's/"/\\"/g')
MOBO_SERIAL=$(echo "$MOBO_SERIAL" | sed 's/"/\\"/g')
BIOS_VERSION=$(echo "$BIOS_VERSION" | sed 's/"/\\"/g')
BIOS_DATE=$(echo "$BIOS_DATE" | sed 's/"/\\"/g')

# Physical Network Adapters
NETWORK_ADAPTERS_JSON="[]"
if [ "$PYTHON3_OK" = "true" ]; then
    NETWORK_ADAPTERS_JSON=$(python3 - 2>/dev/null <<'PYEOF'
import subprocess, json, glob, os, sys, re

adapters = []
try:
    if sys.platform == "darwin":
        r = subprocess.run(['networksetup', '-listallhardwareports'], capture_output=True, text=True, timeout=10)
        port = ""
        device = ""
        entries = []  # list of (port_name, device, mac)
        for line in r.stdout.splitlines():
            if 'Hardware Port:' in line:
                port = line.split(':', 1)[1].strip()
            elif 'Device:' in line:
                device = line.split(':', 1)[1].strip()
            elif 'Ethernet Address:' in line:
                mac = line.split(':', 1)[1].strip()
                if port:
                    entries.append((port, device, mac))
                port = ""; device = ""

        # Get default gateway
        gw = "N/A"
        try:
            rg = subprocess.run(['route', '-n', 'get', 'default'], capture_output=True, text=True, timeout=5)
            for ln in rg.stdout.splitlines():
                if 'gateway:' in ln:
                    gw = ln.split(':', 1)[1].strip(); break
        except: pass

        # Get DNS servers
        dns = "N/A"
        try:
            rd = subprocess.run(['scutil', '--dns'], capture_output=True, text=True, timeout=5)
            dns_list = list(dict.fromkeys([ln.split(':')[1].strip() for ln in rd.stdout.splitlines()
                            if 'nameserver[' in ln and not ln.split(':')[1].strip().startswith('127.')]))
            if dns_list: dns = ", ".join(dns_list[:3])
        except: pass

        # Get Wi-Fi SSID
        wifi_ssid = "N/A"
        try:
            rw = subprocess.run(['/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport', '-I'],
                                capture_output=True, text=True, timeout=5)
            for ln in rw.stdout.splitlines():
                if ' SSID:' in ln:
                    wifi_ssid = ln.split(':', 1)[1].strip(); break
        except: pass

        for (pname, dev, mac) in entries:
            ip4 = "N/A"; ip6 = "N/A"
            if dev:
                try:
                    ri = subprocess.run(['ifconfig', dev], capture_output=True, text=True, timeout=5)
                    for ln in ri.stdout.splitlines():
                        ln = ln.strip()
                        if ln.startswith('inet ') and 'inet6' not in ln:
                            ip4 = ln.split()[1]
                        elif ln.startswith('inet6 '):
                            addr = ln.split()[1].split('%')[0]
                            if not addr.startswith('fe80'):
                                ip6 = addr
                except: pass
            is_wifi = 'wi-fi' in pname.lower() or 'airport' in pname.lower() or 'wireless' in pname.lower()
            adapters.append({
                "name": pname,
                "adapter_type": "Wi-Fi" if is_wifi else "Ethernet",
                "speed": "Active",
                "mac_address": mac,
                "ipv4": ip4,
                "ipv6": ip6,
                "gateway": gw if ip4 != "N/A" else "N/A",
                "dns_servers": dns,
                "wifi_ssid": wifi_ssid if is_wifi else "N/A"
            })
    else:
        # Linux Network Resolution
        dns_servers = "N/A"
        try:
            with open('/etc/resolv.conf', 'r') as f:
                dns_list = [line.split()[1] for line in f if line.startswith('nameserver') and not line.split()[1].startswith('127.')]
                if dns_list: dns_servers = ", ".join(dns_list)
        except: pass

        wifi_ssid = "N/A"
        try:
            r = subprocess.run(['iwgetid', '-r'], capture_output=True, text=True, timeout=5)
            if r.stdout.strip(): wifi_ssid = r.stdout.strip()
            else:
                r2 = subprocess.run(['nmcli', '-t', '-f', 'active,ssid', 'dev', 'wifi'], capture_output=True, text=True, timeout=5)
                for line in r2.stdout.splitlines():
                    if line.startswith('yes:'):
                        wifi_ssid = line.split(':', 1)[1]
                        break
        except: pass

        for iface_path in glob.glob('/sys/class/net/*'):
            iface = os.path.basename(iface_path)
            if iface == 'lo' or iface.startswith('veth') or iface.startswith('docker') or iface.startswith('br-'):
                continue
            mac = "N/A"
            try:
                with open(os.path.join(iface_path, 'address'), 'r') as f:
                    mac = f.read().strip().upper()
            except: pass
            
            speed = "Active"
            try:
                with open(os.path.join(iface_path, 'speed'), 'r') as f:
                    s = f.read().strip()
                    if s and s.isdigit() and int(s) > 0: speed = f"{s} Mbps"
            except: pass

            ip4 = "N/A"
            ip6 = "N/A"
            gw = "N/A"
            try:
                r_ip = subprocess.run(['ip', 'addr', 'show', iface], capture_output=True, text=True, timeout=5)
                ip4_list = [line.strip().split()[1].split('/')[0] for line in r_ip.stdout.splitlines() if 'inet ' in line]
                ip6_list = [line.strip().split()[1].split('/')[0] for line in r_ip.stdout.splitlines() if 'inet6 ' in line]
                if ip4_list: ip4 = ", ".join(ip4_list)
                if ip6_list: ip6 = ", ".join(ip6_list)
            except: pass
            
            try:
                r_route = subprocess.run(['ip', 'route', 'show', 'dev', iface], capture_output=True, text=True, timeout=5)
                for line in r_route.stdout.splitlines():
                    if 'default via' in line:
                        gw = line.split('via')[1].strip().split()[0]
                        break
            except: pass

            is_wifi = 'wl' in iface or 'wifi' in iface or 'wlan' in iface
            adapters.append({
                "name": iface,
                "adapter_type": "Wi-Fi" if is_wifi else "Ethernet",
                "speed": speed,
                "mac_address": mac,
                "ipv4": ip4,
                "ipv6": ip6,
                "gateway": gw,
                "dns_servers": dns_servers,
                "wifi_ssid": wifi_ssid if is_wifi else "N/A"
            })
except Exception: pass
print(json.dumps(adapters))
PYEOF
)
fi
if [ -z "$NETWORK_ADAPTERS_JSON" ] || [ "$NETWORK_ADAPTERS_JSON" = "null" ]; then
    NETWORK_ADAPTERS_JSON="[]"
fi

# Disk Partitions (Filtering out loop snap devices)
DISK_PARTITIONS_JSON="[]"
if [ "$PYTHON3_OK" = "true" ]; then
    if [ "$OS_NAME" = "macOS" ]; then
        DISK_PARTITIONS_JSON=$(python3 - <<'PYEOF'
import subprocess, json
try:
    r = subprocess.run(['diskutil', 'list'], capture_output=True, text=True, timeout=10)
    partitions = []
    for line in r.stdout.splitlines():
        parts = line.split()
        if parts and parts[0].isdigit():
            name = parts[-1] if len(parts) > 1 else "Unknown"
            ptype = parts[1] if len(parts) > 1 else "Unknown"
            size  = " ".join(parts[3:5]) if len(parts) >= 5 else "Unknown"
            partitions.append({"name": name, "type": ptype, "size_gb": size, "bootable": "Unknown", "health": "Healthy", "ssd_hdd": "SSD"})
    print(json.dumps(partitions))
except:
    print("[]")
PYEOF
)
    elif command -v lsblk >/dev/null 2>&1; then
        DISK_PARTITIONS_JSON=$(lsblk -J -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT 2>/dev/null | python3 -c '
import sys, json
try:
    data = json.load(sys.stdin)
    partitions = []
    def flatten(devices):
        for d in devices:
            dtype = d.get("type", "")
            name = d.get("name", "")
            if dtype == "loop" or name.startswith("loop"):
                continue
            fstype = d.get("fstype") or dtype or "ext4"
            size = d.get("size") or "Unknown"
            mp = d.get("mountpoint") or ""
            partitions.append({
                "name": name,
                "type": fstype,
                "size_gb": size,
                "bootable": "Yes" if mp == "/" else "No",
                "health": "Healthy",
                "ssd_hdd": "SSD/HDD"
            })
            if d.get("children"):
                flatten(d["children"])
    flatten(data.get("blockdevices", []))
    print(json.dumps(partitions))
except:
    print("[]")
')
    fi
fi
if [ -z "$DISK_PARTITIONS_JSON" ] || [ "$DISK_PARTITIONS_JSON" = "null" ]; then
    DISK_PARTITIONS_JSON="[]"
fi

# Battery Diagnostics for Linux & macOS
BATTERY_HEALTH="N/A (Desktop)"
CYCLE_COUNT="N/A"
CHARGE_PERCENT="N/A"
DESIGN_CAPACITY="N/A"
FULL_CAPACITY="N/A"

BAT_PATH=$(ls -d /sys/class/power_supply/BAT* 2>/dev/null | head -1)
if [ -n "$BAT_PATH" ]; then
    [ -f "$BAT_PATH/status" ] && BATTERY_HEALTH=$(cat "$BAT_PATH/status" 2>/dev/null | tr -d '\r\n')
    [ -f "$BAT_PATH/capacity" ] && CHARGE_PERCENT="$(cat "$BAT_PATH/capacity" 2>/dev/null | tr -d '\r\n')%"
    [ -f "$BAT_PATH/cycle_count" ] && CYCLE_COUNT=$(cat "$BAT_PATH/cycle_count" 2>/dev/null | tr -d '\r\n')
    
    if [ -f "$BAT_PATH/energy_full_design" ]; then
        DESIGN_CAPACITY="$(awk '{printf "%.0f mWh", $1/1000}' "$BAT_PATH/energy_full_design" 2>/dev/null)"
    elif [ -f "$BAT_PATH/charge_full_design" ]; then
        DESIGN_CAPACITY="$(awk '{printf "%.0f mAh", $1/1000}' "$BAT_PATH/charge_full_design" 2>/dev/null)"
    fi
    
    if [ -f "$BAT_PATH/energy_full" ]; then
        FULL_CAPACITY="$(awk '{printf "%.0f mWh", $1/1000}' "$BAT_PATH/energy_full" 2>/dev/null)"
    elif [ -f "$BAT_PATH/charge_full" ]; then
        FULL_CAPACITY="$(awk '{printf "%.0f mAh", $1/1000}' "$BAT_PATH/charge_full" 2>/dev/null)"
    fi
fi

# Battery — macOS
if [ "$OS_NAME" = "macOS" ]; then
    BATTERY_HEALTH="N/A"
    CHARGE_PERCENT="N/A"
    CYCLE_COUNT="N/A"
    DESIGN_CAPACITY="N/A"
    FULL_CAPACITY="N/A"
    # pmset gives basic battery status
    if command -v pmset >/dev/null 2>&1; then
        _BATT=$(pmset -g batt 2>/dev/null)
        _PCT=$(echo "$_BATT" | grep -oE '[0-9]+%' | head -1)
        [ -n "$_PCT" ] && CHARGE_PERCENT="$_PCT"
        echo "$_BATT" | grep -qi "charging" && BATTERY_HEALTH="Charging"
        echo "$_BATT" | grep -qi "discharging" && BATTERY_HEALTH="Discharging"
        echo "$_BATT" | grep -qi "charged" && BATTERY_HEALTH="Fully Charged"
    fi
    # ioreg gives cycle count and design capacity
    if command -v ioreg >/dev/null 2>&1; then
        _IOREG=$(ioreg -l -n AppleSmartBattery 2>/dev/null)
        _CC=$(echo "$_IOREG" | grep '"CycleCount"' | awk '{print $NF}' | head -1)
        [ -n "$_CC" ] && CYCLE_COUNT="$_CC"
        _DC=$(echo "$_IOREG" | grep '"DesignCapacity"' | awk '{print $NF}' | head -1)
        [ -n "$_DC" ] && DESIGN_CAPACITY="${_DC} mAh"
        _FC=$(echo "$_IOREG" | grep '"MaxCapacity"' | awk '{print $NF}' | head -1)
        [ -n "$_FC" ] && FULL_CAPACITY="${_FC} mAh"
        [ "$BATTERY_HEALTH" = "N/A" ] && {
            _BS=$(echo "$_IOREG" | grep '"BatteryInvalidWakeSeconds"' | head -1)
            [ -n "$_BS" ] && BATTERY_HEALTH="OK"
        }
    fi
fi

# Location Info — pure shell, no Python needed
LOCATION_INFO="Location Unavailable"
if command -v curl >/dev/null 2>&1; then
    GEO_RAW=$(curl -s --max-time 6 "http://ip-api.com/json/" 2>/dev/null)
    if [ -n "$GEO_RAW" ]; then
        # Check status field
        _STATUS=$(echo "$GEO_RAW" | grep -o '"status":"success"')
        if [ -n "$_STATUS" ]; then
            _CITY=$(echo    "$GEO_RAW" | grep -o '"city":"[^"]*"'       | cut -d'"' -f4)
            _REGION=$(echo  "$GEO_RAW" | grep -o '"regionName":"[^"]*"' | cut -d'"' -f4)
            _COUNTRY=$(echo "$GEO_RAW" | grep -o '"country":"[^"]*"'    | cut -d'"' -f4)
            _LAT=$(echo     "$GEO_RAW" | grep -o '"lat":[^,}]*'         | cut -d':' -f2)
            _LON=$(echo     "$GEO_RAW" | grep -o '"lon":[^,}]*'         | cut -d':' -f2)
            _IP=$(echo      "$GEO_RAW" | grep -o '"query":"[^"]*"'      | cut -d'"' -f4)
            [ -n "$_CITY" ] && LOCATION_INFO="${_CITY}, ${_REGION}, ${_COUNTRY} (Lat: ${_LAT}, Lon: ${_LON} | Public IP: ${_IP})"
        fi
    fi
fi
[ -z "$LOCATION_INFO" ] && LOCATION_INFO="Location Unavailable"


# Peripherals
PERIPHERALS_JSON=$(python3 - 2>/dev/null <<'PYEOF'
import subprocess, json
devices = []
try:
    r = subprocess.run(['lsusb'], capture_output=True, text=True, timeout=10)
    for line in r.stdout.split('\n'):
        if 'ID ' in line:
            parts = line.split('ID ')[1].split(' ')
            device_id = parts[0]
            name = ' '.join(parts[1:]).strip()
            if name:
                devices.append({
                    "name": name,
                    "device_id": device_id,
                    "manufacturer": "Unknown",
                    "status": "OK"
                })
except Exception:
    pass
print(json.dumps(devices))
PYEOF
)
if [ -z "$PERIPHERALS_JSON" ] || [ "$PERIPHERALS_JSON" = "null" ]; then
    PERIPHERALS_JSON="[]"
fi

# ────────────────────────────────────────────────────────────────────────────
#  GPU Collection
# ────────────────────────────────────────────────────────────────────────────
GPU_JSON="[]"
echo "Collecting GPU information..."
if [ "$PYTHON3_OK" = "true" ]; then
    GPU_JSON=$(python3 - <<'PYEOF'
import subprocess, json, sys, os

gpus = []
try:
    if sys.platform == "darwin":
        r = subprocess.run(['system_profiler', 'SPDisplaysDataType'], capture_output=True, text=True, timeout=10)
        name = ""
        vram = "Shared (Unified Memory)"
        in_gpu_section = False
        for line in r.stdout.splitlines():
            line_s = line.strip()
            if 'Chipset Model:' in line_s:
                # Flush previous GPU if any
                if name:
                    gpus.append({"name": name, "driver_version": "N/A", "vram": vram})
                name = line_s.split(':', 1)[1].strip()
                vram = "Shared (Unified Memory)"  # default for Apple Silicon
            elif ('VRAM' in line_s or 'Metal' in line_s) and name:
                if 'VRAM' in line_s:
                    vram = line_s.split(':', 1)[1].strip()
        # Flush last GPU
        if name:
            gpus.append({"name": name, "driver_version": "N/A", "vram": vram})
    else:
        # Try lspci first
        r = subprocess.run(['lspci'], capture_output=True, text=True, timeout=5)
        for line in r.stdout.splitlines():
            if 'VGA' in line or '3D controller' in line or 'Display controller' in line:
                name = line.split(':', 2)[-1].strip()
                # Try to get VRAM from sysfs
                vram = "Unknown"
                for drm in os.listdir('/sys/class/drm/') if os.path.isdir('/sys/class/drm/') else []:
                    if drm.startswith('card') and '-' not in drm:
                        vram_path = f'/sys/class/drm/{drm}/device/mem_info_vram_total'
                        if os.path.exists(vram_path):
                            try:
                                with open(vram_path) as f:
                                    vram_bytes = int(f.read().strip())
                                    vram = f"{round(vram_bytes / 1024**2)} MB"
                            except: pass
                gpus.append({"name": name, "driver_version": "N/A", "vram": vram})
except Exception:
    pass
print(json.dumps(gpus))
PYEOF
)
fi
if [ -z "$GPU_JSON" ] || [ "$GPU_JSON" = "null" ]; then
    GPU_JSON="[]"
fi

# ────────────────────────────────────────────────────────────────────────────
#  PHASE 2 — FULL SOFTWARE INVENTORY
# ────────────────────────────────────────────────────────────────────────────
echo "Scanning installed software..."
SOFTWARE_INVENTORY_JSON="[]"

if command -v python3 >/dev/null 2>&1 && [ "$PYTHON3_OK" = "true" ]; then
    SOFTWARE_INVENTORY_JSON=$(python3 - <<'PYEOF'
import subprocess, json, sys, os
apps = []
try:
    if sys.platform == "darwin":
        # macOS: scan /Applications for installed apps
        app_dirs = ['/Applications', os.path.expanduser('~/Applications')]
        for app_dir in app_dirs:
            if not os.path.isdir(app_dir): continue
            for entry in sorted(os.listdir(app_dir)):
                if entry.endswith('.app'):
                    name = entry[:-4]
                    version = "Unknown"
                    plist = os.path.join(app_dir, entry, 'Contents', 'Info.plist')
                    if os.path.exists(plist):
                        try:
                            r = subprocess.run(['defaults', 'read', os.path.join(app_dir, entry, 'Contents', 'Info'), 'CFBundleShortVersionString'],
                                              capture_output=True, text=True, timeout=3)
                            if r.returncode == 0 and r.stdout.strip():
                                version = r.stdout.strip()
                        except: pass
                    apps.append({'name': name, 'version': version, 'publisher': 'Apple/Third-Party', 'install_date': 'Unknown', 'size_mb': 'Unknown'})
        if apps:
            print(json.dumps(apps))
            sys.exit(0)
    else:
        # Linux: dpkg-query
        r = subprocess.run(
            ['dpkg-query', '-W', '--showformat=${Package}|${Version}|${Installed-Size}\n'],
            capture_output=True, text=True, timeout=15
        )
        for line in r.stdout.strip().split('\n')[:150]:
            parts = line.split('|')
            if len(parts) >= 2 and parts[0].strip():
                size_kb = int(parts[2].strip()) if len(parts) > 2 and parts[2].strip().isdigit() else 0
                size_str = f"{round(size_kb/1024,2)} MB" if size_kb > 0 else "Unknown"
                apps.append({'name': parts[0].strip(), 'version': parts[1].strip(), 'publisher': '', 'install_date': 'Unknown', 'size_mb': size_str})
        if apps:
            print(json.dumps(apps))
            sys.exit(0)
except Exception:
    pass
print(json.dumps(apps))
PYEOF
)
fi
echo "Software scan complete."

# ────────────────────────────────────────────────────────────────────────────
#  Build Final JSON Payload — via Python for safe escaping
# ────────────────────────────────────────────────────────────────────────────
JSON=$(python3 - <<PYEOF
import json, sys

def safe(v):
    """Ensure a value is a non-empty string."""
    if v is None: return "Unknown"
    s = str(v).strip()
    return s if s else "Unknown"

def safe_json(raw, fallback="[]"):
    """Parse a JSON fragment, returning fallback if invalid."""
    try:
        return json.loads(raw)
    except Exception:
        return json.loads(fallback)

hw = {
    "cpu":              safe("""$CPU"""),
    "ram":              safe("""$RAM"""),
    "disk":             safe("""$DISK"""),
    "device_name":      safe("""$COMPUTER_NAME"""),
    "manufacturer":     safe("""$MANUFACTURER"""),
    "model":            safe("""$MODEL_NAME"""),
    "serial_number":    safe("""$SERIAL_NUMBER"""),
    "description":      safe("""$DESCRIPTION"""),
    "domain":           safe("""$DOMAIN"""),
    "domain_role":      safe("""$DOMAIN_ROLE"""),
    "shutdown_time":    safe("""$SHUTDOWN_TIME"""),
    "last_backup":      safe("""$LAST_BACKUP"""),
    "life_cycle":       safe("""$LIFE_CYCLE"""),
    "asset_tag":        "N/A",
    "device_type":      "Laptop",
    "architecture":     safe("""$ARCHITECTURE"""),
    "processor_name":   safe("""$CPU"""),
    "cpu_cores":        "Unknown",
    "cpu_threads":      "Unknown",
    "installed_ram":    safe("""$RAM"""),
    "ram_slots":        "Unknown",
    "mobo_manufacturer": safe("""$MOBO_MANUFACTURER"""),
    "mobo_product":     safe("""$MOBO_PRODUCT"""),
    "mobo_version":     safe("""$MOBO_VERSION"""),
    "mobo_serial":      safe("""$MOBO_SERIAL"""),
    "bios_version":     safe("""$BIOS_VERSION"""),
    "bios_date":        safe("""$BIOS_DATE"""),
    "battery_health":   safe("""$BATTERY_HEALTH"""),
    "cycle_count":      safe("""$CYCLE_COUNT"""),
    "charge_percent":   safe("""$CHARGE_PERCENT"""),
    "design_capacity":  safe("""$DESIGN_CAPACITY"""),
    "full_capacity":    safe("""$FULL_CAPACITY"""),
    "location_info":    safe("""$LOCATION_INFO"""),
    "gpu_details":      safe_json("""$GPU_JSON"""),
    "network_adapters": safe_json("""$NETWORK_ADAPTERS_JSON"""),
    "peripherals":      safe_json("""$PERIPHERALS_JSON"""),
    "disk_partitions":  safe_json("""$DISK_PARTITIONS_JSON"""),
}

payload = {
    "execution_datetime":    safe("""$EXECUTION_DATETIME"""),
    "consent":               """$CONSENT_TEXT""",
    "computer_name":         safe("""$COMPUTER_NAME"""),
    "description":           safe("""$DESCRIPTION"""),
    "domain":                safe("""$DOMAIN"""),
    "domain_role":           safe("""$DOMAIN_ROLE"""),
    "shutdown_time":         safe("""$SHUTDOWN_TIME"""),
    "last_backup":           safe("""$LAST_BACKUP"""),
    "life_cycle":            safe("""$LIFE_CYCLE"""),
    "os_name":               safe("""$OS_NAME"""),
    "os_version":            safe("""$OS_VERSION"""),
    "os_build":              "Unknown",
    "last_boot":             "Unknown",
    "uptime":                "Unknown",
    "architecture":          safe("""$ARCHITECTURE"""),
    "license_status":        safe("""$LICENSE_STATUS"""),
    "antivirus":             safe_json("""$ANTIVIRUS""", '["Built-in OS Protections"]'),
    "firewall":              "Unknown",
    "bitlocker":             "N/A",
    "secure_boot":           "Unknown",
    "tpm":                   "Unknown",
    "hotfixes":              [],
    "mac_address":           safe("""$MAC_ADDRESS"""),
    "drive_name":            safe("""$DRIVE_NAME"""),
    "compression_utilities": safe_json("""$COMPRESSION_UTILITIES""", '["tar","gzip"]'),
    "printers":              safe_json("""$PRINTERS"""),
    "hardware_details":      hw,
    "network_details":       safe_json("""$NETWORK_DETAILS"""),
    "user_accounts":         safe_json("""$USER_ACCOUNTS"""),
    "software_inventory":    safe_json("""$SOFTWARE_INVENTORY_JSON"""),
    "login_history":         [],
}
print(json.dumps(payload))
PYEOF
)

CLIENT_ID="CLIENT_ID_PLACEHOLDER"
API_URL="http://127.0.0.1:8000/upload-audit?client_id=$CLIENT_ID"

echo "Uploading secure payload to backend..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
     -H "Content-Type: application/json" \
     -d "$JSON")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
# Use sed to strip last line — works on both macOS (BSD) and Linux (GNU)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "Audit upload completed successfully!"
else
    echo "Upload failed. HTTP Status: $HTTP_STATUS"
    echo "Details: $BODY"
fi

echo "Press enter to exit..."
read -r

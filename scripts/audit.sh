#!/bin/bash
# ==============================================================================
#                 NSDL WORKSTATION COMPLIANCE AUDIT SCRIPT (Mac/Linux)
# ==============================================================================
# Version: 2.1.0

echo "Collecting Workstation Compliance Data..."

EXECUTION_DATETIME=$(date +"%d-%b-%Y_%H:%M:%S")
CONSENT_TEXT="We provide approval to NSDL e-Governance Infrastructure Ltd.(NSDL e-Gov) to capture the details regarding the System details and share the details with NSDL e-Gov."
COMPUTER_NAME=$(hostname)

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
MAC_ADDRESS="Unknown"

if command -v ifconfig >/dev/null 2>&1; then
    MAC_ADDRESS=$(ifconfig | grep -v '00:00:00:00:00:00' | grep -o -E '([[:xdigit:]]{1,2}:){5}[[:xdigit:]]{1,2}' | head -n 1 | tr -d ':' | tr '[:lower:]' '[:upper:]')
elif command -v ip >/dev/null 2>&1; then
    MAC_ADDRESS=$(ip link | grep -v '00:00:00:00:00:00' | grep -o -E '([[:xdigit:]]{1,2}:){5}[[:xdigit:]]{1,2}' | head -n 1 | tr -d ':' | tr '[:lower:]' '[:upper:]')
fi
if [ -z "$MAC_ADDRESS" ]; then
    MAC_ADDRESS="Unknown"
fi

DRIVE_NAME="No CD Unit Found"
COMPRESSION_UTILITIES='["tar", "gzip", "zip (built-in)"]'
ANTIVIRUS='["Built-in OS Protections"]'
PRINTERS="[]"

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

IP_ADDRESS="Unknown"
if command -v hostname >/dev/null 2>&1; then
    IP_ADDRESS=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
if [ -z "$IP_ADDRESS" ]; then
    if command -v ifconfig >/dev/null 2>&1; then
        IP_ADDRESS=$(ifconfig 2>/dev/null | awk '/inet / && !/127.0.0.1/{print $2}' | head -n 1)
    fi
fi
if [ -z "$IP_ADDRESS" ]; then
    IP_ADDRESS="Unknown"
fi

NETWORK_DETAILS="[{\"ip_address\": \"$IP_ADDRESS\", \"gateway\": \"Unknown\", \"mac\": \"$MAC_ADDRESS\"}]"
USER_ACCOUNTS="[{\"name\": \"$USER\", \"disabled\": \"False\"}]"

JSON=$(cat <<EOF
{
    "execution_datetime": "$EXECUTION_DATETIME",
    "consent": "$CONSENT_TEXT",
    "computer_name": "$COMPUTER_NAME",
    "os_name": "$OS_NAME",
    "os_version": "$OS_VERSION",
    "architecture": "$ARCHITECTURE",
    "license_status": "$LICENSE_STATUS",
    "hotfixes": [],
    "mac_address": "$MAC_ADDRESS",
    "drive_name": "$DRIVE_NAME",
    "compression_utilities": $COMPRESSION_UTILITIES,
    "antivirus": $ANTIVIRUS,
    "printers": $PRINTERS,
    "hardware_details": {
        "cpu": "$CPU",
        "ram": "$RAM",
        "disk": "$DISK"
    },
    "network_details": $NETWORK_DETAILS,
    "user_accounts": $USER_ACCOUNTS
}
EOF
)

CLIENT_ID="CLIENT_ID_PLACEHOLDER"
API_URL="http://127.0.0.1:8000/upload-audit?client_id=$CLIENT_ID"

echo "Uploading secure payload to backend..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
     -H "Content-Type: application/json" \
     -d "$JSON")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "Audit upload completed successfully!"
else
    echo "Upload failed. HTTP Status: $HTTP_STATUS"
    echo "Details: $BODY"
fi

echo "Press enter to exit..."
read -r

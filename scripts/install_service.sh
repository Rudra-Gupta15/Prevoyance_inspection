#!/usr/bin/env bash
# ==============================================================================
# Infra-Pulse Continuous Auto-Audit Daemon Installer (macOS & Linux)
# Runs audit 1 time immediately, then schedules background execution every 2 hours
# ==============================================================================

set -e

SERVER_URL="${1:-http://192.168.1.52:8000}"
SERVER_URL="${SERVER_URL%/}"

INSTALL_DIR="$HOME/.infrapulse"
SCRIPT_PATH="$INSTALL_DIR/audit.sh"

echo "--------------------------------------------------------"
echo "  Infra-Pulse Continuous Auto-Audit Installer (macOS/Linux)"
echo "--------------------------------------------------------"

# 1. Create directory
mkdir -p "$INSTALL_DIR"

# 2. Download audit agent
echo "[1/4] Downloading audit agent from $SERVER_URL..."
if command -v curl >/dev/null 2>&1; then
    curl -sSL "$SERVER_URL/scripts/audit.sh" -o "$SCRIPT_PATH"
elif command -v wget >/dev/null 2>&1; then
    wget -qO "$SCRIPT_PATH" "$SERVER_URL/scripts/audit.sh"
else
    echo "[-] Error: Neither curl nor wget is installed."
    exit 1
fi

chmod +x "$SCRIPT_PATH"
echo "[+] Audit agent saved to: $SCRIPT_PATH"

# 3. Execute Initial Audit Scan
echo "[2/4] Executing initial compliance audit scan..."
export SERVER_URL="$SERVER_URL"
bash "$SCRIPT_PATH" "$SERVER_URL" || true
echo "[+] Initial compliance audit completed."

# 4. Configure 2-Hour Auto-Scheduler
echo "[3/4] Registering 2-Hour Auto-Audit Background Daemon..."

OS_TYPE="$(uname -s)"

if [ "$OS_TYPE" = "Darwin" ]; then
    # macOS LaunchAgent (~/Library/LaunchAgents/com.infrapulse.audit.plist)
    LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
    mkdir -p "$LAUNCH_AGENTS_DIR"
    PLIST_PATH="$LAUNCH_AGENTS_DIR/com.infrapulse.audit.plist"

    cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.infrapulse.audit</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPT_PATH</string>
        <string>$SERVER_URL</string>
    </array>
    <key>StartInterval</key>
    <integer>7200</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$INSTALL_DIR/audit_stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$INSTALL_DIR/audit_stderr.log</string>
</dict>
</plist>
EOF

    # Unload if existing and load launchd agent
    launchctl unload "$PLIST_PATH" 2>/dev/null || true
    launchctl load -w "$PLIST_PATH"
    echo "[+] macOS LaunchAgent registered: $PLIST_PATH (Runs every 2 hours)"

else
    # Linux Crontab (0 */2 * * *)
    CRON_CMD="0 */2 * * * /bin/bash $SCRIPT_PATH $SERVER_URL > $INSTALL_DIR/cron.log 2>&1"
    ( crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH" ; echo "$CRON_CMD" ) | crontab -
    echo "[+] Linux Crontab job registered (Runs every 2 hours)."
fi

echo "--------------------------------------------------------"
echo "[SUCCESS] Infra-Pulse Auto-Audit Daemon is active!"
echo "          - Initial scan posted to server."
echo "          - Background scans scheduled every 2 hours."
echo "--------------------------------------------------------"

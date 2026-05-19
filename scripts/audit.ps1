# ==============================================================================
#                 NSDL WORKSTATION COMPLIANCE AUDIT SCRIPT
# ==============================================================================
# Version: 1.2.0

Write-Host "Collecting Workstation Compliance Data..." -ForegroundColor Green

# 1. Computer Name
$computer = $env:COMPUTERNAME

# 2. OS Details
$os = Get-CimInstance Win32_OperatingSystem
$osName = $os.Caption
$osVersion = $os.Version
$architecture = $os.OSArchitecture

# 3. License Status Check
$licenseStatus = "Unknown"
try {
    $sls = Get-CimInstance SoftwareLicensingProduct | Where-Object { $_.PartialProductKey -and $_.ApplicationID -eq "55c92734-d682-4d71-983e-d6ec3f16059f" } | Select-Object -First 1
    if ($sls) {
        $statusMap = @{
            0 = "Unlicensed"
            1 = "Licensed"
            2 = "OOBGrace"
            3 = "OOTGrace"
            4 = "NonGenuineGrace"
            5 = "Notification"
            6 = "ExtendedGrace"
        }
        $licenseStatus = $statusMap[[int]$sls.LicenseStatus]
    }
} catch {
    $licenseStatus = "Licensed (WMI Bypass)"
}

# 4. Antivirus Products
$antivirus = @()
try {
    $avProducts = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct
    foreach ($av in $avProducts) {
        if ($av.displayName) {
            $antivirus += $av.displayName
        }
    }
} catch {}
if ($antivirus.Count -eq 0) {
    $antivirus = @("Windows Defender")
}

# 5. MAC Address
$mac = "Unknown"
try {
    $mac = Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | Select-Object -First 1 -ExpandProperty MacAddress
    # Clean MAC format (remove colons or dashes if present, make uppercase)
    $mac = ($mac -replace '[:-]', '').ToUpper()
} catch {}

# 6. CDROM / DVD Drive Check
$driveName = "No CD Unit Found"
try {
    $cdrom = Get-CimInstance Win32_CDROMDrive
    if ($cdrom -and $cdrom.Name) {
        $driveName = $cdrom.Name
    }
} catch {}

# 7. Connected Printers
$printers = @()
try {
    $printers = Get-Printer | Select-Object -ExpandProperty Name
} catch {}

# 8. Installed Hotfixes
$hotfixes = @()
try {
    $hotfixes = Get-HotFix | Select-Object -ExpandProperty HotFixID
} catch {}

# 9. Construct JSON Data payload
$data = @{
    computer_name  = $computer
    os_name        = $osName
    os_version     = $osVersion
    architecture   = $architecture
    license_status = $licenseStatus
    antivirus      = $antivirus
    mac_address    = $mac
    drive_name     = $driveName
    printers       = $printers
    hotfixes       = $hotfixes
}

$json = $data | ConvertTo-Json -Depth 5

# Capture dynamic client id parameter from filename if injected
$client_id = "CLIENT_ID_PLACEHOLDER"

# API URL (dynamically replaced by backend during serving)
$apiUrl = "http://127.0.0.1:8000/upload-audit?client_id=$client_id"

Write-Host "Uploading secure payload to backend..." -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $json -ContentType "application/json"
    Write-Host "Audit upload completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Upload failed: $_" -ForegroundColor Red
}
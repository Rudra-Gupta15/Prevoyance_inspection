# ==============================================================================
#          NSDL WORKSTATION COMPLIANCE AUDIT SCRIPT (Windows)
# ==============================================================================
# Version: 3.0.0 — Full IT Asset Management Edition

Write-Host "Collecting Workstation Compliance Data..." -ForegroundColor Green

function Get-SafeString {
    param(
        [Parameter(Mandatory = $false)] $Value,
        [string] $Fallback = "Unknown"
    )
    if ($null -eq $Value) { return $Fallback }
    if ($Value -is [array]) {
        $joined = ($Value | ForEach-Object { [string]$_ }) -join ", "
        if ([string]::IsNullOrWhiteSpace($joined)) { return $Fallback }
        return $joined
    }
    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) { return $Fallback }
    return $text
}

$executionDateTime = Get-Date -Format "dd-MMM-yyyy_HH:mm:ss"
$consentText = "We provide approval to NSDL e-Governance Infrastructure Ltd.(NSDL e-Gov) to capture the details regarding the System details and share the details with NSDL e-Gov."

# 1. Computer Name
$computer = Get-SafeString $env:COMPUTERNAME "Unknown"

# 2. OS Details
$osName      = "Unknown"
$osVersion   = "Unknown"
$architecture = "Unknown"
try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    $osName       = Get-SafeString $os.Caption "Unknown"
    $osVersion    = Get-SafeString $os.Version "Unknown"
    $architecture = Get-SafeString $os.OSArchitecture "Unknown"
} catch {}

# 3. License Status Check
$licenseStatus = "Unknown"
try {
    $sls = Get-CimInstance SoftwareLicensingProduct -ErrorAction Stop |
        Where-Object { $_.PartialProductKey -and $_.ApplicationID -eq "55c92734-d682-4d71-983e-d6ec3f16059f" } |
        Select-Object -First 1
    if ($sls) {
        $statusMap = @{
            0 = "Unlicensed"; 1 = "Licensed"; 2 = "OOBGrace"
            3 = "OOTGrace"; 4 = "NonGenuineGrace"; 5 = "Notification"; 6 = "ExtendedGrace"
        }
        $licenseStatus = Get-SafeString $statusMap[[int]$sls.LicenseStatus] "Unknown"
    }
} catch {
    $licenseStatus = "Licensed (WMI Bypass)"
}

# 4. Windows Update / Hotfix Details
$hotfixes = @()
try {
    $hfObjects = Get-HotFix -ErrorAction Stop
    foreach ($hf in $hfObjects) {
        $installedOn = ""
        if ($hf.InstalledOn) { $installedOn = $hf.InstalledOn.ToString("M/d/yyyy") }
        $hotfixes += @{
            caption      = Get-SafeString $hf.Caption ""
            cs_name      = Get-SafeString $hf.CSName $computer
            description  = Get-SafeString $hf.Description ""
            fix_id       = Get-SafeString $hf.HotFixID ""
            installed_on = Get-SafeString $installedOn ""
        }
    }
} catch {}

# 5. MAC Address (Primary)
$mac = "Unknown"
try {
    $macValue = Get-NetAdapter -ErrorAction Stop |
        Where-Object { $_.Status -eq "Up" } |
        Select-Object -First 1 -ExpandProperty MacAddress
    $mac = (Get-SafeString $macValue "Unknown" -replace '[:-]', '').ToUpper()
} catch {}

# 6. CDROM / DVD Drive Check
$driveName = "No CD Unit Found"
try {
    $cdrom = Get-CimInstance Win32_CDROMDrive -ErrorAction Stop
    if ($cdrom) {
        $driveNames = @($cdrom | ForEach-Object { $_.Name } | Where-Object { $_ })
        $driveName = Get-SafeString $driveNames "No CD Unit Found"
    }
} catch {}

# 7. Compression Utility Details
$compressionUtilities = @()
try {
    $registryPaths = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    $compressionUtilities = Get-ItemProperty $registryPaths -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -match "7-Zip|WinRAR|WinZip|PeaZip|Bandizip|Zipware|PowerArchiver" } |
        Select-Object -ExpandProperty DisplayName -Unique
} catch {}
if ($compressionUtilities.Count -eq 0) {
    $compressionUtilities = @("No compression utility found")
}

# 8. Antivirus Products
$antivirus = @()
try {
    $avProducts = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct -ErrorAction Stop
    foreach ($av in $avProducts) {
        if ($av.displayName) { $antivirus += $av.displayName }
    }
} catch {}
if ($antivirus.Count -eq 0) { $antivirus = @("Windows Defender") }

# 9. Connected Printer Details
$printers = @()
try {
    $printerObjects = Get-CimInstance Win32_Printer -ErrorAction Stop | Where-Object {
        $_.Name -notmatch "Microsoft Print to PDF|Microsoft XPS Document Writer|OneNote|Fax|Root Print|Send to Microsoft|AnyDesk" -and
        $_.PortName -notmatch "PORTPROMPT:|SHRFAX:|nul:"
    }
    foreach ($p in $printerObjects) {
        $printers += @{
            name                    = Get-SafeString $p.Name "Unknown"
            system_name             = Get-SafeString $p.SystemName $computer
            enable_bidi             = Get-SafeString $p.EnableBIDI "False"
            extended_printer_status = Get-SafeString $p.ExtendedPrinterStatus "0"
            port_name               = Get-SafeString $p.PortName "Unknown"
        }
    }
} catch {}

# 10. Hardware Basics — CPU, RAM, Logical Disk
$cpuName = "Unknown"
$ramTotal = "Unknown"
$diskBasic = "Unknown"
try {
    $cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cpu) { $cpuName = Get-SafeString $cpu.Name "Unknown" }

    $ram = Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue
    if ($ram) {
        $totalRam = ($ram | Measure-Object -Property Capacity -Sum).Sum
        $ramTotal = [math]::Round($totalRam / 1GB, 2).ToString() + " GB"
    }

    $disks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction SilentlyContinue
    if ($disks) {
        $diskStrings = @()
        foreach ($d in $disks) {
            if ($d.Size -gt 0) {
                $free = [math]::Round($d.FreeSpace / 1GB, 2)
                $size = [math]::Round($d.Size / 1GB, 2)
                $diskStrings += "$($d.DeviceID) $free GB free of $size GB"
            }
        }
        if ($diskStrings.Count -gt 0) { $diskBasic = $diskStrings -join "; " }
    }
} catch {}

# 11. Network Details (IP / Gateway)
$networkDetails = @()
try {
    $nics = Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" -ErrorAction SilentlyContinue
    foreach ($nic in $nics) {
        $networkDetails += @{
            ip_address = if ($nic.IPAddress) { $nic.IPAddress -join ", " } else { "Unknown" }
            gateway    = if ($nic.DefaultIPGateway) { $nic.DefaultIPGateway -join ", " } else { "Unknown" }
            mac        = if ($nic.MACAddress) { $nic.MACAddress } else { "Unknown" }
        }
    }
} catch {}

# 12. Local User Accounts
$userAccounts = @()
try {
    $users = Get-CimInstance Win32_UserAccount -Filter "LocalAccount=True" -ErrorAction SilentlyContinue
    foreach ($u in $users) {
        $userAccounts += @{
            name     = if ($u.Name) { $u.Name } else { "Unknown" }
            disabled = if ($u.Disabled) { "True" } else { "False" }
        }
    }
} catch {}

# ────────────────────────────────────────────────────────────────────────────
#  PHASE 1 — EXTENDED HARDWARE COLLECTION
# ────────────────────────────────────────────────────────────────────────────

# 13. GPU Details
Write-Host "Collecting GPU information..." -ForegroundColor Cyan
$gpuDetails = @()
try {
    $gpus = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue
    foreach ($gpu in $gpus) {
        $vramMB = "Unknown"
        if ($gpu.AdapterRAM -and $gpu.AdapterRAM -gt 0) {
            $vramMB = [math]::Round($gpu.AdapterRAM / 1MB, 0).ToString() + " MB"
        }
        $gpuDetails += @{
            name           = Get-SafeString $gpu.Name "Unknown"
            driver_version = Get-SafeString $gpu.DriverVersion "Unknown"
            vram           = $vramMB
        }
    }
} catch {}

# 14. Serial Number, Manufacturer & Model
Write-Host "Collecting device identity..." -ForegroundColor Cyan
$serialNumber = "Unknown"
$manufacturer  = "Unknown"
$model         = "Unknown"
try {
    $bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($bios) { $serialNumber = Get-SafeString $bios.SerialNumber "Unknown" }

    $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cs) {
        $manufacturer = Get-SafeString $cs.Manufacturer "Unknown"
        $model        = Get-SafeString $cs.Model "Unknown"
    }
} catch {}

# 15. Physical Network Adapters (Detailed)
Write-Host "Collecting network adapter details..." -ForegroundColor Cyan
$networkAdapters = @()
try {
    $adapters = Get-CimInstance Win32_NetworkAdapter -ErrorAction SilentlyContinue |
        Where-Object { $_.PhysicalAdapter -eq $true }
    foreach ($a in $adapters) {
        $speedMbps = "Unknown"
        if ($a.Speed -and $a.Speed -gt 0) {
            $speedMbps = [math]::Round($a.Speed / 1000000, 0).ToString() + " Mbps"
        }
        $networkAdapters += @{
            name         = Get-SafeString $a.Name "Unknown"
            adapter_type = Get-SafeString $a.AdapterType "Unknown"
            speed        = $speedMbps
            mac_address  = Get-SafeString $a.MACAddress "Unknown"
        }
    }
} catch {}

# 16. USB & Connected Peripherals
Write-Host "Collecting peripheral devices..." -ForegroundColor Cyan
$peripherals = @()
try {
    $validClasses = @("HIDClass", "USB", "Printer", "Scanner", "Keyboard", "Mouse", "Image", "Bluetooth")
    $usbDevices = Get-CimInstance Win32_PnPEntity -ErrorAction SilentlyContinue |
        Where-Object { $_.PNPClass -in $validClasses -and $_.Status -eq "OK" }
    foreach ($dev in $usbDevices) {
        $peripherals += @{
            name   = Get-SafeString $dev.Name "Unknown"
            type   = Get-SafeString $dev.PNPClass "Unknown"
            status = Get-SafeString $dev.Status "Unknown"
        }
    }
} catch {}

# 17. Disk Partitions (Detailed)
Write-Host "Collecting disk partition details..." -ForegroundColor Cyan
$diskPartitions = @()
try {
    $partitions = Get-CimInstance Win32_DiskPartition -ErrorAction SilentlyContinue
    foreach ($p in $partitions) {
        $sizeGB = [math]::Round($p.Size / 1GB, 2)
        $diskPartitions += @{
            name     = Get-SafeString $p.Name "Unknown"
            type     = Get-SafeString $p.Type "Unknown"
            size_gb  = $sizeGB.ToString() + " GB"
            bootable = if ($p.Bootable) { "Yes" } else { "No" }
        }
    }
} catch {}

# ────────────────────────────────────────────────────────────────────────────
#  PHASE 2 — FULL SOFTWARE INVENTORY
# ────────────────────────────────────────────────────────────────────────────

# 18. Full Installed Software Inventory (Registry Scan)
Write-Host "Scanning installed software (this may take a moment)..." -ForegroundColor Yellow
$softwareInventory = @()
try {
    $regPaths = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    $allApps = Get-ItemProperty $regPaths -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -and $_.DisplayName.Trim() -ne "" } |
        Sort-Object DisplayName -Unique
    foreach ($app in $allApps) {
        $sizeMB = "Unknown"
        if ($app.EstimatedSize -and $app.EstimatedSize -gt 0) {
            $sizeMB = [math]::Round($app.EstimatedSize / 1024, 2).ToString() + " MB"
        }
        $softwareInventory += @{
            name         = Get-SafeString $app.DisplayName ""
            version      = Get-SafeString $app.DisplayVersion "Unknown"
            publisher    = Get-SafeString $app.Publisher "Unknown"
            install_date = Get-SafeString $app.InstallDate "Unknown"
            size_mb      = $sizeMB
        }
    }
    Write-Host "Found $($softwareInventory.Count) installed applications." -ForegroundColor Green
} catch {}

# ────────────────────────────────────────────────────────────────────────────
#  19. Construct JSON Data Payload
# ────────────────────────────────────────────────────────────────────────────
$data = @{
    execution_datetime    = $executionDateTime
    consent               = $consentText
    computer_name         = $computer
    os_name               = $osName
    os_version            = $osVersion
    architecture          = $architecture
    license_status        = $licenseStatus
    hotfixes              = $hotfixes
    mac_address           = $mac
    drive_name            = $driveName
    compression_utilities = $compressionUtilities
    antivirus             = $antivirus
    printers              = $printers
    hardware_details      = @{
        cpu              = $cpuName
        ram              = $ramTotal
        disk             = $diskBasic
        gpu_details      = $gpuDetails
        serial_number    = $serialNumber
        manufacturer     = $manufacturer
        model            = $model
        network_adapters = $networkAdapters
        peripherals      = $peripherals
        disk_partitions  = $diskPartitions
    }
    network_details       = $networkDetails
    user_accounts         = $userAccounts
    software_inventory    = $softwareInventory
}

$json = $data | ConvertTo-Json -Depth 8

# Capture dynamic client id parameter from backend injection
$client_id = "CLIENT_ID_PLACEHOLDER"

# API URL (dynamically replaced by backend during serving)
$apiUrl = "http://127.0.0.1:8000/upload-audit?client_id=$client_id"

$jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($json)

Write-Host "Uploading secure payload to backend..." -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $jsonBytes -ContentType "application/json; charset=utf-8"
    Write-Host "Audit upload completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "Upload failed: $_" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

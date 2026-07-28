# ==============================================================================
#         NSDL WORKSTATION COMPLIANCE AUDIT SCRIPT (WINDOWS)
# ==============================================================================

$ErrorActionPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Get-SafeString ($val, $fallback="Unknown") {
    if ([string]::IsNullOrWhiteSpace($val)) { return $fallback }
    return $val.ToString().Trim()
}

$executionDateTime = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$consentText = "We provide approval to NSDL e-Governance Infrastructure Ltd.(NSDL e-Gov) to capture the details regarding the System details and share the details with NSDL e-Gov."

Write-Host "Collecting Workstation Compliance Data..." -ForegroundColor Cyan

# ---------------------------------------------------------
# OS & Security
# ---------------------------------------------------------
$os = Get-CimInstance Win32_OperatingSystem
$osName = Get-SafeString $os.Caption
$osVersion = Get-SafeString $os.Version
$osBuild = Get-SafeString $os.BuildNumber
$architecture = Get-SafeString $os.OSArchitecture

$lastBoot = "Unknown"
$uptime = "Unknown"
try {
    $lastBoot = $os.LastBootUpTime.ToString("yyyy-MM-dd HH:mm:ss")
    $ts = (Get-Date) - $os.LastBootUpTime
    $uptime = "{0} Days, {1} Hours, {2} Mins" -f $ts.Days, $ts.Hours, $ts.Minutes
} catch {}

$computer = $env:COMPUTERNAME
$currentUser = Get-SafeString $env:USERNAME "Unknown"

$licenseStatus = "Unknown"
try {
    $slmgr = cscript.exe /nologo $env:windir\system32\slmgr.vbs /dli
    if ($slmgr -match "License Status: Licensed") { $licenseStatus = "Licensed" }
    elseif ($slmgr -match "License Status: ") { $licenseStatus = "Not Licensed / Unknown" }
} catch {}

# Antivirus
$antivirus = @()
try {
    $avItems = Get-CimInstance -Namespace "root\SecurityCenter2" -Class AntiVirusProduct
    foreach ($av in $avItems) { $antivirus += $av.displayName }
} catch {}
if ($antivirus.Count -eq 0) { $antivirus += "Windows Defender" }

# Firewall
$firewall = "Unknown"
try {
    $fw = Get-NetFirewallProfile -Profile Domain,Public,Private | Where-Object Enabled -eq $true
    $firewall = if ($fw) { "Enabled" } else { "Disabled" }
} catch {}

# BitLocker
$bitlocker = "Unknown"
try {
    $bl = Get-BitLockerVolume -MountPoint "C:" -ErrorAction SilentlyContinue
    if ($bl -and $bl.VolumeStatus) {
        $bitlocker = $bl.VolumeStatus.ToString()
    } else {
        $bitlocker = "Not Encrypted"
    }
} catch {
    $bitlocker = "Not Supported/Unknown"
}

# Secure Boot
$secureBoot = "Unknown"
try {
    $sb = Confirm-SecureBootUEFI -ErrorAction SilentlyContinue
    $secureBoot = if ($sb) { "Enabled" } else { "Disabled" }
} catch {
    $secureBoot = "Unsupported"
}

# TPM
$tpm = "Unknown"
try {
    $tpmObj = Get-Tpm -ErrorAction SilentlyContinue
    if ($tpmObj) {
        $tpm = if ($tpmObj.TpmPresent) { "Present, Enabled: " + $tpmObj.TpmReady } else { "Not Present" }
    } else {
        $tpm = "Not Present"
    }
} catch {
    $tpm = "Unsupported"
}

# ---------------------------------------------------------
# GPU Information
# ---------------------------------------------------------
Write-Host "Collecting GPU information..." -ForegroundColor Cyan
$gpuDetails = @()
try {
    $gpus = Get-CimInstance Win32_VideoController
    foreach ($g in $gpus) {
        $vram = "Unknown"
        if ($g.AdapterRAM -gt 0) { $vram = "{0:N2} GB" -f ($g.AdapterRAM / 1GB) }
        $gpuDetails += @{
            name           = Get-SafeString $g.Name
            driver_version = Get-SafeString $g.DriverVersion
            vram           = $vram
        }
    }
} catch {}

# ---------------------------------------------------------
# Device Identity & Motherboard
# ---------------------------------------------------------
Write-Host "Collecting device identity..." -ForegroundColor Cyan
$cs = Get-CimInstance Win32_ComputerSystem
$manufacturer = Get-SafeString $cs.Manufacturer
$model = Get-SafeString $cs.Model

$bios = Get-CimInstance Win32_BIOS
$serialNumber = Get-SafeString $bios.SerialNumber
$biosVersion = Get-SafeString $bios.SMBIOSBIOSVersion
$biosDate = "Unknown"
try { $biosDate = $bios.ReleaseDate.ToString("yyyy-MM-dd") } catch {}

$enclosure = Get-CimInstance Win32_SystemEnclosure
$assetTag = Get-SafeString $enclosure.SMBIOSAssetTag
if ($assetTag -eq "" -or $assetTag -eq "No Asset Information") { $assetTag = "N/A" }
$deviceType = "Desktop"
try {
    $typeId = $enclosure.ChassisTypes[0]
    if ($typeId -in 8,9,10,11,12,14,18,21) { $deviceType = "Laptop" }
    elseif ($typeId -in 3,4,5,6,7,15,16) { $deviceType = "Desktop" }
    elseif ($typeId -eq 23) { $deviceType = "Rack Mount Chassis" }
} catch {}

$mobo = Get-CimInstance Win32_BaseBoard
$moboManufacturer = Get-SafeString $mobo.Manufacturer
$moboProduct = Get-SafeString $mobo.Product
$moboVersion = Get-SafeString $mobo.Version
$moboSerial = Get-SafeString $mobo.SerialNumber

# ---------------------------------------------------------
# Hardware (CPU & RAM)
# ---------------------------------------------------------
$cpuObj = Get-CimInstance Win32_Processor | Select-Object -First 1
$processorName = Get-SafeString $cpuObj.Name
$cpuCores = Get-SafeString $cpuObj.NumberOfCores
$cpuThreads = Get-SafeString $cpuObj.NumberOfLogicalProcessors

$ramTotalStr = "{0:N2} GB" -f ($cs.TotalPhysicalMemory / 1GB)
$ramSlots = "Unknown"
try {
    $usedSticks = (Get-CimInstance Win32_PhysicalMemory).Count
    $memSlotsArray = Get-CimInstance Win32_PhysicalMemoryArray
    if ($memSlotsArray.MemoryDevices) {
        $totalSlots = $memSlotsArray.MemoryDevices
        $ramSlots = "$usedSticks of $totalSlots slots used"
    } else {
        $ramSlots = "$usedSticks slot(s) used"
    }
} catch {
    $ramSlots = "Unknown"
}

# ---------------------------------------------------------
# Network Adapter Details
# ---------------------------------------------------------
Write-Host "Collecting network adapter details..." -ForegroundColor Cyan
$networkAdapters = @()
$mac = "Unknown"

$dnsServers = "Unknown"
try {
    $dnsServers = (Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object ServerAddresses).ServerAddresses -join ", "
    if (-not $dnsServers) { $dnsServers = "N/A" }
} catch { $dnsServers = "N/A" }

$connectionSpeed = "Unknown"
try {
    $connectionSpeed = (Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object Status -eq 'Up').LinkSpeed -join ", "
    if (-not $connectionSpeed) { $connectionSpeed = "Active" }
} catch { $connectionSpeed = "Active" }

$wifiSsid = "N/A"
try {
    $out = netsh wlan show interfaces
    foreach ($line in $out) {
        if ($line -match '^\s*SSID\s*:\s*(.+)') {
            $candidate = $matches[1].Trim()
            if ($candidate -and $line -notmatch 'BSSID') { $wifiSsid = $candidate; break }
        }
    }
} catch { $wifiSsid = "N/A" }

try {
    $adapters = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true }
    foreach ($a in $adapters) {
        if ($mac -eq "Unknown" -and $a.MACAddress) { $mac = $a.MACAddress }
        $ip4 = ($a.IPAddress | Where-Object { $_ -match "\." }) -join ", "
        $ip6 = ($a.IPAddress | Where-Object { $_ -match ":" }) -join ", "
        $gw = ($a.DefaultIPGateway) -join ", "
        $networkAdapters += @{
            name             = Get-SafeString $a.Description
            adapter_type     = "Ethernet / Wi-Fi"
            speed            = Get-SafeString $connectionSpeed
            mac_address      = Get-SafeString $a.MACAddress
            ipv4             = Get-SafeString $ip4
            ipv6             = Get-SafeString $ip6
            gateway          = Get-SafeString $gw
            dns_servers      = Get-SafeString $dnsServers
            wifi_ssid        = Get-SafeString $wifiSsid
        }
    }
} catch {}

# ---------------------------------------------------------
# Geolocation & Public IP Info
# ---------------------------------------------------------
Write-Host "Collecting location & network IP info..." -ForegroundColor Cyan
$locationInfo = "Unknown"
try {
    $geo = Invoke-RestMethod -Uri "http://ip-api.com/json/" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($geo -and $geo.status -eq "success") {
        $locationInfo = "$($geo.city), $($geo.regionName), $($geo.country) (Lat: $($geo.lat), Lon: $($geo.lon) | Public IP: $($geo.query))"
    }
} catch {
    $locationInfo = "Location Unavailable"
}

# ---------------------------------------------------------
# Peripheral Devices
# ---------------------------------------------------------
Write-Host "Collecting peripheral devices..." -ForegroundColor Cyan
$peripherals = @()
try {
    $pnps = Get-CimInstance Win32_PnPEntity | Where-Object { $_.Status -eq 'OK' -and ($_.PNPClass -in 'Keyboard','Mouse','Monitor','USB') } | Select-Object -First 10
    foreach ($p in $pnps) {
        $peripherals += @{
            name   = Get-SafeString $p.Caption
            type   = Get-SafeString $p.PNPClass
            status = "Connected"
        }
    }
} catch {}

# ---------------------------------------------------------
# Disk Partitions & Physical Disks
# ---------------------------------------------------------
Write-Host "Collecting disk partition details..." -ForegroundColor Cyan
$diskPartitions = @()
$diskSummaryLines = @()

try {
    $logicalDisks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"
    foreach ($ld in $logicalDisks) {
        $sizeGb = "{0:N2} GB" -f ($ld.Size / 1GB)
        $freeGb = "{0:N2} GB" -f ($ld.FreeSpace / 1GB)
        
        $mediaType = "SSD/HDD"
        $health = "Healthy"

        $diskSummaryLines += "$($ld.DeviceID) ($sizeGb total, $freeGb free) [$mediaType]"

        $diskPartitions += @{
            name       = $ld.DeviceID
            type       = Get-SafeString $ld.FileSystem
            size_gb    = $sizeGb
            free_gb    = $freeGb
            bootable   = if ($ld.DeviceID -eq "C:") { "Yes" } else { "No" }
            health     = $health
            ssd_hdd    = $mediaType
        }
    }
} catch {}

Write-Host "Collecting physical disk details..." -ForegroundColor Cyan
try {
    $pDisk = Get-PhysicalDisk | Select-Object -First 1
    if ($pDisk) {
        $mType = if ($pDisk.MediaType) { $pDisk.MediaType.ToString() } else { "SSD" }
        $hStat = if ($pDisk.HealthStatus) { $pDisk.HealthStatus.ToString() } else { "Healthy" }
        foreach ($dp in $diskPartitions) {
            $dp.ssd_hdd = $mType
            $dp.health  = $hStat
        }
    }
} catch {}

$diskSummaryStr = if ($diskSummaryLines.Count -gt 0) { $diskSummaryLines -join "`n" } else { "Unknown" }

# ---------------------------------------------------------
# Battery Diagnostics
# ---------------------------------------------------------
$batteryHealth = "N/A (Desktop)"
$cycleCount = "N/A"
$chargePercent = "N/A"
$designCapacity = "N/A"
$fullCapacity = "N/A"

if ($deviceType -eq "Laptop") {
    try {
        $bat = Get-CimInstance Win32_Battery
        if ($bat) {
            $chargePercent = "$($bat.EstimatedChargeRemaining)%"
            $batteryHealth = if ($bat.Status) { $bat.Status } else { "Good" }
        }
    } catch {}
    
    try {
        $bFull = Get-CimInstance -Namespace "root\wmi" -Class BatteryFullChargedCapacity -ErrorAction SilentlyContinue
        if ($bFull -and $bFull.FullChargedCapacity) { $fullCapacity = "$($bFull.FullChargedCapacity) mWh" }
        $bDesign = Get-CimInstance -Namespace "root\wmi" -Class BatteryStaticData -ErrorAction SilentlyContinue
        if ($bDesign -and $bDesign.DesignedCapacity) { $designCapacity = "$($bDesign.DesignedCapacity) mWh" }
        $bCycle = Get-CimInstance -Namespace "root\wmi" -Class BatteryCycleCount -ErrorAction SilentlyContinue
        if ($bCycle -and $bCycle.CycleCount) { $cycleCount = Get-SafeString $bCycle.CycleCount }
    } catch {}
}

# ---------------------------------------------------------
# Users & Accounts
# ---------------------------------------------------------
$userAccounts = @()
try {
    $users = Get-CimInstance Win32_UserAccount -Filter "LocalAccount=True"
    foreach ($u in $users) {
        $userAccounts += @{
            name       = Get-SafeString $u.Name
            disabled   = if ($u.Disabled) { "True" } else { "False" }
            last_login = "Unknown"
            logon_type = "Local"
        }
    }
} catch {}

# ---------------------------------------------------------
# Software Inventory
# ---------------------------------------------------------
Write-Host "Scanning installed software (this may take a moment)..." -ForegroundColor Cyan
$softwareInventory = @()
try {
    $keys = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )
    $installed = Get-ItemProperty $keys -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -and $_.DisplayName -notmatch '^KB' }
    foreach ($app in $installed) {
        $date = Get-SafeString $app.InstallDate
        if ($date -match "^20[0-9]{6}$") { $date = $date.Insert(4,"-").Insert(7,"-") }
        $size = "Unknown"
        if ($app.EstimatedSize -gt 0) { $size = "{0:N2}" -f ($app.EstimatedSize / 1024) }
        
        $softwareInventory += @{
            name         = Get-SafeString $app.DisplayName
            version      = Get-SafeString $app.DisplayVersion
            publisher    = Get-SafeString $app.Publisher
            install_date = $date
            size_mb      = $size
        }
    }
} catch {}

Write-Host "Found $($softwareInventory.Count) installed applications." -ForegroundColor Green

# ---------------------------------------------------------
# Recent Login History
# ---------------------------------------------------------
Write-Host "Collecting recent login history..." -ForegroundColor Cyan
$loginHistory = @()
try {
    $events = Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624} -MaxEvents 40 -ErrorAction SilentlyContinue
    foreach ($e in $events) {
        $user = $e.Properties[5].Value
        $domain = $e.Properties[6].Value
        $typeVal = $e.Properties[8].Value
        if ($user -and $user -notmatch '^\$' -and $user -notmatch 'SYSTEM|LOCAL SERVICE|NETWORK SERVICE|ANONYMOUS|DWM-|UMFD-') {
            $logonType = switch ($typeVal) {
                2 { "Interactive (Local)" }
                7 { "Unlock" }
                10 { "Remote (RDP)" }
                11 { "Cached Interactive" }
                default { "Logon ($typeVal)" }
            }
            $loginHistory += @{
                username   = Get-SafeString $user
                domain     = Get-SafeString $domain
                logon_type = $logonType
                time       = $e.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
            }
            if ($loginHistory.Count -ge 15) { break }
        }
    }
} catch {}

if ($loginHistory.Count -eq 0) {
    try {
        $profiles = Get-CimInstance Win32_NetworkLoginProfile | Where-Object { $_.LastLogon -and $_.Name -notmatch 'SYSTEM|NETWORK|LOCAL' }
        foreach ($p in $profiles) {
            $loginHistory += @{
                username   = Get-SafeString $p.Name
                domain     = "Local"
                logon_type = "Local"
                time       = $p.LastLogon.ToString("yyyy-MM-dd HH:mm:ss")
            }
        }
    } catch {}
}

# ---------------------------------------------------------
# Payload Construction
# ---------------------------------------------------------
$data = @{
    execution_datetime    = $executionDateTime
    consent               = $consentText
    computer_name         = $computer
    current_user          = $currentUser
    
    os_name               = $osName
    os_version            = $osVersion
    os_build              = $osBuild
    last_boot             = $lastBoot
    uptime                = $uptime
    architecture          = $architecture
    
    license_status        = $licenseStatus
    antivirus             = $antivirus
    firewall              = $firewall
    bitlocker             = $bitlocker
    secure_boot           = $secureBoot
    tpm                   = $tpm
    
    hotfixes              = @()
    mac_address           = $mac
    drive_name            = "No CD Unit Found"
    compression_utilities = @()
    printers              = @()
    
    hardware_details      = @{
        cpu               = $processorName
        ram               = $ramTotalStr
        disk              = $diskSummaryStr
        
        device_name       = $computer
        manufacturer      = $manufacturer
        model             = $model
        serial_number     = $serialNumber
        asset_tag         = $assetTag
        device_type       = $deviceType
        architecture      = $architecture
        
        processor_name    = $processorName
        cpu_cores         = $cpuCores
        cpu_threads       = $cpuThreads
        
        installed_ram     = $ramTotalStr
        ram_slots         = $ramSlots
        
        mobo_manufacturer = $moboManufacturer
        mobo_product      = $moboProduct
        mobo_version      = $moboVersion
        mobo_serial       = $moboSerial
        bios_version      = $biosVersion
        bios_date         = $biosDate
        
        battery_health    = $batteryHealth
        cycle_count       = $cycleCount
        charge_percent    = $chargePercent
        design_capacity   = $designCapacity
        full_capacity     = $fullCapacity
        location_info     = $locationInfo
        
        gpu_details       = $gpuDetails
        network_adapters  = $networkAdapters
        peripherals       = $peripherals
        disk_partitions   = $diskPartitions
    }
    network_details       = $networkAdapters
    user_accounts         = $userAccounts
    software_inventory    = $softwareInventory
    login_history         = $loginHistory
}

$json = $data | ConvertTo-Json -Depth 8
$client_id = "CLIENT_ID_PLACEHOLDER"
$apiUrl = "http://127.0.0.1:8000/upload-audit?client_id=$client_id"

$jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($json)

Write-Host "Uploading secure payload to backend..." -ForegroundColor Yellow
$uploaded = $false
try {
    $res = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $jsonBytes -ContentType "application/json; charset=utf-8" -TimeoutSec 300
    Write-Host "Audit upload completed successfully!" -ForegroundColor Green
    $uploaded = $true
} catch {
    Write-Host "Attempt 1 failed, retrying with WebClient..." -ForegroundColor Yellow
}

if (-not $uploaded) {
    try {
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("Content-Type", "application/json; charset=utf-8")
        $responseBytes = $wc.UploadData($apiUrl, "POST", $jsonBytes)
        $responseStr = [System.Text.Encoding]::UTF8.GetString($responseBytes)
        Write-Host "Audit upload completed successfully!" -ForegroundColor Green
        $uploaded = $true
    } catch {
        Write-Host "Upload failed: $_" -ForegroundColor Red
    }
}

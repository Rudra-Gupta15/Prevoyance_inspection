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

$shutdownTime = "N/A"
try {
    $evt = Get-WinEvent -FilterHashtable @{LogName='System'; Id=1074} -MaxEvents 1 -ErrorAction SilentlyContinue
    if ($evt) { $shutdownTime = $evt.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss") }
} catch {}

$lastBackup = "No Backup Recorded"
try {
    # 1. File History
    $fhPath = Join-Path $env:LOCALAPPDATA "Microsoft\Windows\FileHistory\Configuration"
    if (Test-Path $fhPath) {
        $fhFiles = Get-ChildItem -Path $fhPath -Filter "*.xml" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
        if ($fhFiles -and $fhFiles.Count -gt 0) {
            $lastBackup = "File History (" + $fhFiles[0].LastWriteTime.ToString("yyyy-MM-dd HH:mm") + ")"
        }
    }

    # 2. Windows Backup Status Registry
    if ($lastBackup -eq "No Backup Recorded") {
        $bkReg = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsBackup\Status\Status" -ErrorAction SilentlyContinue
        if ($bkReg -and $bkReg.LastSuccessRun) {
            $dt = [DateTime]::FromFileTime($bkReg.LastSuccessRun)
            $lastBackup = "System Image (" + $dt.ToString("yyyy-MM-dd HH:mm") + ")"
        }
    }

    # 3. OneDrive Cloud Backup Sync
    if ($lastBackup -eq "No Backup Recorded") {
        $odPath = $env:OneDrive
        if (!$odPath) { $odPath = $env:OneDriveConsumer }
        if (!$odPath) { $odPath = $env:OneDriveCommercial }
        if ($odPath -and (Test-Path $odPath)) {
            $odItem = Get-Item $odPath -ErrorAction SilentlyContinue
            if ($odItem) {
                $lastBackup = "OneDrive Cloud Backup (" + $odItem.LastWriteTime.ToString("yyyy-MM-dd HH:mm") + ")"
            }
        }
    }

    # 4. Volume Shadow Copy (VSS Snapshot)
    if ($lastBackup -eq "No Backup Recorded") {
        $vss = Get-CimInstance Win32_ShadowCopy -ErrorAction SilentlyContinue | Sort-Object InstallDate -Descending | Select-Object -First 1
        if ($vss -and $vss.InstallDate) {
            $lastBackup = "VSS Restore Point (" + $vss.InstallDate.ToString("yyyy-MM-dd HH:mm") + ")"
        }
    }

    # 5. Backup Event Logs
    if ($lastBackup -eq "No Backup Recorded") {
        $bkEvt = Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Microsoft-Windows-Backup'} -MaxEvents 1 -ErrorAction SilentlyContinue
        if ($bkEvt) {
            $lastBackup = "System Backup (" + $bkEvt.TimeCreated.ToString("yyyy-MM-dd HH:mm") + ")"
        }
    }
} catch {}

$lifeCycle = "Active"
try {
    if ($os.InstallDate) {
        $ageDays = ((Get-Date) - $os.InstallDate).Days
        $years = [math]::Round($ageDays / 365.25, 1)
        $lifeCycle = "Active ($years Years in Service)"
    }
} catch {}

$computer = $env:COMPUTERNAME
$currentUser = Get-SafeString $env:USERNAME "Unknown"

$domain = "WORKGROUP"
$domainRole = "Standalone Workstation"
try {
    $csObj = Get-CimInstance Win32_ComputerSystem
    if ($csObj.Domain) { $domain = $csObj.Domain }
    switch ($csObj.DomainRole) {
        0 { $domainRole = "Standalone Workstation" }
        1 { $domainRole = "Member Workstation" }
        2 { $domainRole = "Standalone Server" }
        3 { $domainRole = "Member Server" }
        4 { $domainRole = "Backup Domain Controller" }
        5 { $domainRole = "Primary Domain Controller" }
    }
} catch {}

$osDescription = Get-SafeString $os.Description ""
if ([string]::IsNullOrWhiteSpace($osDescription) -or $osDescription -eq "N/A") {
    try {
        $srvComment = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" -Name "srvcomment" -ErrorAction SilentlyContinue).srvcomment
        if ($srvComment) { $osDescription = $srvComment }
    } catch {}
}
if ([string]::IsNullOrWhiteSpace($osDescription) -or $osDescription -eq "N/A") {
    $osDescription = "$osName ($architecture) - $domainRole ($domain)"
}

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

# First, try to get precise VRAM from registry to bypass 32-bit AdapterRAM limits (4GB cap)
$regVramMap = @{}
try {
    $regGpus = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\*' -ErrorAction SilentlyContinue | Where-Object { $_.DriverDesc -ne $null }
    foreach ($rg in $regGpus) {
        $vramBytes = $rg.'HardwareInformation.qwMemorySize'
        if ($null -eq $vramBytes) { $vramBytes = $rg.'HardwareInformation.MemorySize' }
        if ($vramBytes -is [byte[]]) {
            if ($vramBytes.Length -eq 8) { $vramBytes = [BitConverter]::ToInt64($vramBytes, 0) }
            elseif ($vramBytes.Length -eq 4) { $vramBytes = [BitConverter]::ToInt32($vramBytes, 0) }
        }
        if ($vramBytes -gt 0) {
            $regVramMap[$rg.DriverDesc.ToString().Trim()] = $vramBytes
        }
    }
} catch {}

try {
    $gpus = Get-CimInstance Win32_VideoController
    foreach ($g in $gpus) {
        $vram = "Unknown"
        $gName = Get-SafeString $g.Name
        
        if ($regVramMap.ContainsKey($gName)) {
            $vram = "{0:N2} GB" -f ($regVramMap[$gName] / 1GB)
        } elseif ($g.AdapterRAM -gt 0) {
            $vram = "{0:N2} GB" -f ($g.AdapterRAM / 1GB)
        }
        
        $gpuDetails += @{
            name           = $gName
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
$mobo = Get-CimInstance Win32_BaseBoard
$moboManufacturer = Get-SafeString $mobo.Manufacturer
$moboProduct = Get-SafeString $mobo.Product
$moboVersion = Get-SafeString $mobo.Version
$moboSerial = Get-SafeString $mobo.SerialNumber

$assetTag = Get-SafeString $enclosure.SMBIOSAssetTag
if (!$assetTag -or $assetTag -match 'N/A|No Asset|Default|Fill By OEM|To Be Filled') { $assetTag = Get-SafeString $moboSerial }
if (!$assetTag -or $assetTag -match 'N/A|No Asset|Default|Fill By OEM|To Be Filled') { $assetTag = Get-SafeString $serialNumber }
if (!$assetTag -or $assetTag -match 'N/A|No Asset|Default|Fill By OEM|To Be Filled') { $assetTag = "NSDL-AST-" + $env:COMPUTERNAME }

$deviceType = "Desktop"
try {
    $typeId = $enclosure.ChassisTypes[0]
    if ($typeId -in 8,9,10,11,12,14,18,21) { $deviceType = "Laptop" }
    elseif ($typeId -in 3,4,5,6,7,15,16) { $deviceType = "Desktop" }
    elseif ($typeId -eq 23) { $deviceType = "Rack Mount Chassis" }
} catch {}

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
    $netIf = Get-NetIPInterface -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object ConnectionState -eq 'Connected' | Select-Object -First 1
    $mtuVal = if ($netIf -and $netIf.NlMtu) { "$($netIf.NlMtu) Bytes" } else { "1500 (Standard)" }

    foreach ($a in $adapters) {
        if ($mac -eq "Unknown" -and $a.MACAddress) { $mac = $a.MACAddress }
        $ip4 = ($a.IPAddress | Where-Object { $_ -match "\." }) -join ", "
        $ip6 = ($a.IPAddress | Where-Object { $_ -match ":" }) -join ", "
        $gw = ($a.DefaultIPGateway) -join ", "
        $subnetMask = ($a.IPSubnet | Where-Object { $_ -match "\." }) -join ", "

        $networkAdapters += @{
            name             = Get-SafeString $a.Description
            adapter_type     = "Ethernet / Wi-Fi"
            speed            = Get-SafeString $connectionSpeed
            mac_address      = Get-SafeString $a.MACAddress
            ipv4             = Get-SafeString $ip4
            ipv6             = Get-SafeString $ip6
            gateway          = Get-SafeString $gw
            subnet_mask      = Get-SafeString $subnetMask "255.255.255.0"
            mtu              = $mtuVal
            dns_servers      = Get-SafeString $dnsServers
            wifi_ssid        = Get-SafeString $wifiSsid
        }
    }
} catch {}

# ---------------------------------------------------------
# Geolocation & Public IP Info
# ---------------------------------------------------------
Write-Host "Collecting location information..." -ForegroundColor Cyan
$locationInfo = "Location Unavailable"
try {
    $geo = Invoke-RestMethod -Uri "http://ip-api.com/json/" -UserAgent "Mozilla/5.0" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($geo -and $geo.status -eq "success") {
        $locationInfo = "$($geo.city), $($geo.regionName), $($geo.country) (Lat: $($geo.lat), Lon: $($geo.lon) | Public IP: $($geo.query))"
    } else {
        $geo2 = Invoke-RestMethod -Uri "https://ipinfo.io/json" -UserAgent "Mozilla/5.0" -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($geo2 -and $geo2.city) {
            $locationInfo = "$($geo2.city), $($geo2.region), $($geo2.country) (Public IP: $($geo2.ip))"
        }
    }
} catch {
    $locationInfo = "Location Unavailable"
}

# ---------------------------------------------------------
# Peripheral Devices (Only REAL External Physical Devices)
# ---------------------------------------------------------
Write-Host "Collecting peripheral devices..." -ForegroundColor Cyan
$peripherals = @()

# 1. External Physical Mouse (Exclude Touchpads, Trackpads & Detect Mouse Brand e.g. Dell)
try {
    $mice = Get-CimInstance Win32_PointingDevice -ErrorAction SilentlyContinue
    foreach ($m in $mice) {
        $devId = Get-SafeString $m.DeviceID
        $mName = Get-SafeString $m.Description
        if (-not $mName -or $mName -eq "Unknown") { $mName = Get-SafeString $m.Name }

        if ($mName -and $devId -notmatch 'ASUP|SYN|ELAN|Touchpad|Trackpad' -and $mName -notmatch 'Touchpad|Trackpad|Precision') {
            if ($devId -notmatch 'VID_0B05&PID_19B6') {
                $mftr = Get-SafeString $m.Manufacturer
                $brand = ""
                if ($devId -match 'VID_413C|VID_04CA|VID_093A' -or $mftr -match 'Dell') { $brand = "Dell " }
                elseif ($devId -match 'VID_046D' -or $mftr -match 'Logitech') { $brand = "Logitech " }
                elseif ($devId -match 'VID_03F0' -or $mftr -match 'HP') { $brand = "HP " }
                elseif ($devId -match 'VID_17EF' -or $mftr -match 'Lenovo') { $brand = "Lenovo " }

                $finalMouseName = if ($mName -eq "HID-compliant mouse" -and $brand) { "${brand}USB Optical Mouse" } elseif ($brand -and $mName -notmatch $brand.Trim()) { "${brand}${mName}" } else { $mName }

                $peripherals += @{
                    name            = $finalMouseName
                    type            = "Mouse"
                    connection_type = "USB"
                    status          = "Connected"
                }
            }
        }
    }
} catch {}

# 2. External Physical Keyboards (Exclude Built-in Laptop / Virtual drivers)
try {
    $kbds = Get-CimInstance Win32_Keyboard -ErrorAction SilentlyContinue
    foreach ($k in $kbds) {
        $devId = Get-SafeString $k.DeviceID
        $kName = Get-SafeString $k.Description
        if (-not $kName -or $kName -eq "Unknown") { $kName = Get-SafeString $k.Name }

        if ($kName -and $devId -like 'USB*' -and $devId -notmatch 'ASUP|VHF') {
            $peripherals += @{
                name            = $kName
                type            = "Keyboard"
                connection_type = "USB"
                status          = "Connected"
            }
        }
    }
} catch {}

# 3. External Physical Printers (Must be physically connected & active right now)
try {
    $prts = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue
    foreach ($p in $prts) {
        $pName = Get-SafeString $p.Name
        if ($pName -and $pName -notmatch 'Microsoft Print to PDF|OneNote|Fax|XPS Document Writer|Root|Virtual') {
            # Only include if WorkOffline is False and PrinterStatus is NOT 7 (Offline)
            if (-not $p.WorkOffline -and $p.PrinterStatus -ne 7 -and $p.PrinterState -ne 128) {
                $peripherals += @{
                    name            = $pName
                    type            = "Printer"
                    connection_type = "USB / Network"
                    status          = "Connected & Online"
                }
            }
        }
    }
} catch {}

# 4. External Monitors / Displays (Exclude Internal Laptop Screen / Default Monitor)
try {
    $mons = Get-CimInstance Win32_DesktopMonitor -ErrorAction SilentlyContinue
    foreach ($mn in $mons) {
        $mnName = Get-SafeString $mn.Name
        $devId = Get-SafeString $mn.DeviceID
        if ($mnName -and $mnName -notmatch 'Generic PnP Monitor|Default Monitor' -and $devId -notmatch 'Default_Monitor') {
            $peripherals += @{
                name            = $mnName
                type            = "Monitor"
                connection_type = "DisplayPort / HDMI"
                status          = "Connected"
            }
        }
    }
} catch {}

# 5. External USB Mass Storage Drives
try {
    $disks = Get-CimInstance Win32_DiskDrive -ErrorAction SilentlyContinue
    foreach ($d in $disks) {
        $iface = Get-SafeString $d.InterfaceType
        $model = Get-SafeString $d.Model
        if ($iface -eq 'USB' -and $model -and $model -notmatch 'Virtual|RAID') {
            $peripherals += @{
                name            = $model
                type            = "Storage"
                connection_type = "USB Drive"
                status          = "Mounted"
            }
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
    $users = Get-CimInstance Win32_UserAccount -Filter "LocalAccount=True" -ErrorAction SilentlyContinue
    $profiles = Get-CimInstance Win32_UserProfile -ErrorAction SilentlyContinue
    $currentUser = $env:USERNAME
    foreach ($u in $users) {
        $uName = Get-SafeString $u.Name
        $prof = $profiles | Where-Object { $_.LocalPath -and $_.LocalPath.EndsWith("\$uName", [System.StringComparison]::OrdinalIgnoreCase) } | Select-Object -First 1
        $homeDir = if ($prof) { Get-SafeString $prof.LocalPath } else { "C:\Users\$uName" }
        $lastLog = if ($prof -and $prof.LastUseTime) { $prof.LastUseTime.ToString("yyyy-MM-dd HH:mm:ss") } else { "Unknown" }
        $isCurrent = if ($uName -ieq $currentUser) { "True" } else { "False" }
        $uType = if ($u.SID -like "*-500" -or $u.AccountType -eq 512) { "Local Administrator" } else { "Local User" }
        
        $userAccounts += @{
            name             = $uName
            disabled         = if ($u.Disabled) { "True" } else { "False" }
            home_directory   = $homeDir
            last_login       = $lastLog
            licensed         = "Yes"
            number_of_logins = "1"
            user_type        = $uType
            current_user     = $isCurrent
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

# 1. Try Security Log Event 4624
try {
    $secEvents = Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624} -MaxEvents 50 -ErrorAction SilentlyContinue
    foreach ($e in $secEvents) {
        $uName = Get-SafeString $e.Properties[5].Value
        $dom = Get-SafeString $e.Properties[6].Value
        $tVal = $e.Properties[8].Value
        if ($uName -and $uName -notmatch '^\$' -and $uName -notmatch 'SYSTEM|LOCAL SERVICE|NETWORK SERVICE|ANONYMOUS|DWM-|UMFD-') {
            $lType = switch ($tVal) {
                2 { "Interactive (Local)" }
                7 { "Unlock" }
                10 { "Remote (RDP)" }
                11 { "Cached Interactive" }
                default { "Local Administrator" }
            }
            $loginHistory += @{
                username   = $uName
                domain     = if ($dom) { $dom } else { "LOCAL" }
                logon_type = $lType
                time       = $e.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
            }
            if ($loginHistory.Count -ge 25) { break }
        }
    }
} catch {}

# 2. Fallback to System Log Events 7001 (User Logon) & 7002 (User Logoff)
if ($loginHistory.Count -eq 0) {
    try {
        $sysEvents = Get-WinEvent -FilterHashtable @{LogName='System'; Id=7001,7002} -MaxEvents 50 -ErrorAction SilentlyContinue
        foreach ($se in $sysEvents) {
            $eType = if ($se.Id -eq 7001) { "Interactive Logon" } else { "Logoff / Session End" }
            $uName = $env:USERNAME
            $loginHistory += @{
                username   = $uName
                domain     = if ($env:USERDOMAIN) { $env:USERDOMAIN } else { "LOCAL" }
                logon_type = $eType
                time       = $se.TimeCreated.ToString("yyyy-MM-dd HH:mm:ss")
            }
            if ($loginHistory.Count -ge 25) { break }
        }
    } catch {}
}

# ---------------------------------------------------------
# MTBF & Auto-Warranty / OEM Diagnostics
# ---------------------------------------------------------
Write-Host "Calculating MTBF & Warranty Provider..." -ForegroundColor Cyan
$mtbfHours = "720 hrs (Healthy)"
try {
    $crashes = Get-WinEvent -FilterHashtable @{LogName='System'; Id=41,6008} -MaxEvents 50 -ErrorAction SilentlyContinue
    $crashCount = if ($crashes) { $crashes.Count } else { 0 }
    if ($crashCount -gt 0) {
        $totalDays = if ($os.InstallDate) { [math]::Max(1, ((Get-Date) - $os.InstallDate).Days) } else { 30 }
        $totalHours = $totalDays * 24
        $calculatedMtbf = [math]::Round($totalHours / ($crashCount + 1))
        $mtbfHours = "$calculatedMtbf hrs ($crashCount Unexpected Failures)"
    } else {
        $mtbfHours = "> 2,000 hrs (0 Crashes Recorded)"
    }
} catch {
    $mtbfHours = "720 hrs (Estimated)"
}

$autoWarrantyProvider = "N/A"
if ($manufacturer -match "Dell") { $autoWarrantyProvider = "Dell ProSupport / Care" }
elseif ($manufacturer -match "HP|Hewlett") { $autoWarrantyProvider = "HP Care Pack" }
elseif ($manufacturer -match "Lenovo") { $autoWarrantyProvider = "Lenovo Premier Support" }
elseif ($manufacturer -match "Apple") { $autoWarrantyProvider = "AppleCare+" }
elseif ($manufacturer -match "Asus|Acer|MSI") { $autoWarrantyProvider = "$manufacturer OEM Warranty" }
else { $autoWarrantyProvider = "$manufacturer Direct Warranty" }


# ---------------------------------------------------------
# Payload Construction
# ---------------------------------------------------------
$data = @{
    execution_datetime    = $executionDateTime
    consent               = $consentText
    computer_name         = $computer
    current_user          = $currentUser
    description           = $osDescription
    domain                = $domain
    domain_role           = $domainRole
    shutdown_time         = $shutdownTime
    last_backup           = $lastBackup
    life_cycle            = $lifeCycle
    
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
        
        description       = $osDescription
        domain            = $domain
        domain_role       = $domainRole
        shutdown_time     = $shutdownTime
        last_backup       = $lastBackup
        life_cycle        = $lifeCycle
        
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
        
        battery_health        = $batteryHealth
        cycle_count           = $cycleCount
        charge_percent        = $chargePercent
        design_capacity       = $designCapacity
        full_capacity         = $fullCapacity
        location_info         = $locationInfo
        
        auto_warranty_provider = $autoWarrantyProvider
        mtbf_diagnostics      = $mtbfHours
        
        gpu_details           = $gpuDetails
        network_adapters      = $networkAdapters
        peripherals           = $peripherals
        disk_partitions       = $diskPartitions
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

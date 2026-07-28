$gpus = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\*' -ErrorAction SilentlyContinue | Where-Object { $_.DriverDesc -ne $null }
foreach ($g in $gpus) {
    $vramBytes = $g.'HardwareInformation.qwMemorySize'
    if ($vramBytes -eq $null) { $vramBytes = $g.'HardwareInformation.MemorySize' }
    if ($vramBytes -eq $null) { $vramBytes = 0 }
    if ($vramBytes -is [byte[]]) { $vramBytes = [BitConverter]::ToInt64($vramBytes, 0) }
    Write-Output "$($g.DriverDesc): $($vramBytes / 1GB) GB"
}

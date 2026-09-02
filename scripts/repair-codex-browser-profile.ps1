param(
    [switch]$ForceClose,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[codex-repair] $Message"
}

function Get-CodexProcesses {
    $names = @(
        "Codex",
        "OpenAI.Codex"
    )

    Get-Process -ErrorAction SilentlyContinue |
        Where-Object {
            $names -contains $_.ProcessName -or
            $_.ProcessName -like "OpenAI.Codex*"
        }
}

function Add-ExistingProfile {
    param(
        [System.Collections.Generic.List[string]]$Profiles,
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return
    }

    $expanded = [Environment]::ExpandEnvironmentVariables($Path)
    if (Test-Path -LiteralPath $expanded -PathType Container) {
        $resolved = (Resolve-Path -LiteralPath $expanded).Path
        if (-not $Profiles.Contains($resolved)) {
            [void]$Profiles.Add($resolved)
        }
    }
}

$running = @(Get-CodexProcesses)
if ($running.Count -gt 0) {
    if (-not $ForceClose) {
        Write-Host "Codex is still running. Close Codex completely, then run this script again." -ForegroundColor Yellow
        Write-Host "Running processes:"
        $running | ForEach-Object {
            Write-Host ("  - {0} (PID {1})" -f $_.ProcessName, $_.Id)
        }
        Write-Host ""
        Write-Host "If Codex will not close normally, rerun with: -ForceClose" -ForegroundColor Yellow
        exit 1
    }

    Write-Step "Closing Codex processes..."
    if (-not $DryRun) {
        $running | Stop-Process -Force
        Start-Sleep -Seconds 2
    }
}

$profiles = [System.Collections.Generic.List[string]]::new()

Add-ExistingProfile $profiles "$env:APPDATA\Codex\web\Codex"
Add-ExistingProfile $profiles "$env:LOCALAPPDATA\Codex\web\Codex"

$packageRoot = Join-Path $env:LOCALAPPDATA "Packages"
if (Test-Path -LiteralPath $packageRoot -PathType Container) {
    Get-ChildItem -LiteralPath $packageRoot -Directory -Filter "OpenAI.Codex_*" -ErrorAction SilentlyContinue |
        ForEach-Object {
            Add-ExistingProfile $profiles (Join-Path $_.FullName "LocalCache\Roaming\Codex\web\Codex")
        }
}

if ($profiles.Count -eq 0) {
    Write-Host "No Codex browser profile was found in the known locations." -ForegroundColor Yellow
    Write-Host "Checked:"
    Write-Host "  - $env:APPDATA\Codex\web\Codex"
    Write-Host "  - $env:LOCALAPPDATA\Codex\web\Codex"
    Write-Host "  - $env:LOCALAPPDATA\Packages\OpenAI.Codex_*\LocalCache\Roaming\Codex\web\Codex"
    exit 0
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

foreach ($profile in $profiles) {
    $profileInfo = Get-Item -LiteralPath $profile
    $parent = $profileInfo.Parent.FullName
    $leaf = $profileInfo.Name
    $backupName = "$leaf.bak-$timestamp"
    $backupPath = Join-Path $parent $backupName

    $i = 1
    while (Test-Path -LiteralPath $backupPath) {
        $backupName = "$leaf.bak-$timestamp-$i"
        $backupPath = Join-Path $parent $backupName
        $i++
    }

    Write-Step "Profile: $profile"
    Write-Step "Backup : $backupPath"

    if (-not $DryRun) {
        Rename-Item -LiteralPath $profile -NewName $backupName
    }
}

if ($DryRun) {
    Write-Host "Dry run complete. No files were changed." -ForegroundColor Cyan
} else {
    Write-Host "Done. Reopen Codex; it should create a fresh browser profile automatically." -ForegroundColor Green
    Write-Host "Your old profile is kept as a .bak-* folder next to the original profile."
}

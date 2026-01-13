param(
    [string]$EvidenceRoot = "evidence\local-machine"
)

$ErrorActionPreference = "Stop"

function New-DirectorySafe {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Get-Hash {
    param([string]$Path)
    if (Test-Path $Path) {
        return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash
    }
    return $null
}

function Write-Json {
    param(
        [Parameter(Mandatory=$true)]$Object,
        [Parameter(Mandatory=$true)][string]$Path,
        [int]$Depth = 8
    )
    $json = $Object | ConvertTo-Json -Depth $Depth
    Set-Content -Encoding UTF8 -Path $Path -Value $json
}

function Safe {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][scriptblock]$Block
    )
    try {
        return [ordered]@{
            ok = $true
            name = $Name
            value = & $Block
            error = $null
        }
    } catch {
        return [ordered]@{
            ok = $false
            name = $Name
            value = $null
            error = [ordered]@{
                type = $_.Exception.GetType().FullName
                message = $_.Exception.Message
            }
        }
    }
}

function Get-NextRunPath {
    param([string]$Root)
    $existing = Get-ChildItem -Path $Root -Filter "run-*.json" -ErrorAction SilentlyContinue
    $max = 0
    foreach ($f in $existing) {
        if ($f.BaseName -match '^run-(\d+)$') {
            $n = [int]$matches[1]
            if ($n -gt $max) { $max = $n }
        }
    }
    $next = $max + 1
    $name = "run-{0}.json" -f $next.ToString("000")
    return (Join-Path $Root $name)
}

# Evidence root only. This is the only allowed write boundary.
New-DirectorySafe $EvidenceRoot

$timestamp = (Get-Date).ToString("o")

# Capture environment without assuming any subsystem is functional.
$osInfo = Safe "Win32_OperatingSystem" { Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber }
$psInfo = [ordered]@{
    edition = $PSVersionTable.PSEdition
    version = $PSVersionTable.PSVersion.ToString()
}

$adminCheck = Safe "IsAdministrator" {
    ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Execution policy introspection is known to fail on hostile platforms. Capture as evidence.
$execPolicy = Safe "Get-ExecutionPolicy" { Get-ExecutionPolicy -List }

$environment = [ordered]@{
    timestamp = $timestamp
    user = $env:USERNAME
    powershell = $psInfo
    os = $osInfo
    isAdmin = $adminCheck
}

$environmentPath = Join-Path $EvidenceRoot "environment.json"
Write-Json -Object $environment -Path $environmentPath

$executionContext = [ordered]@{
    timestamp = $timestamp
    invocation = $MyInvocation.Line
    scriptPath = $MyInvocation.MyCommand.Path
    executionPolicy = $execPolicy
}

$executionContextPath = Join-Path $EvidenceRoot "execution-context.json"
Write-Json -Object $executionContext -Path $executionContextPath

# Run artefact
$runPath = Get-NextRunPath -Root $EvidenceRoot

$runEvidence = [ordered]@{
    timestamp = $timestamp
    status = "completed"
    doctrine = [ordered]@{
        nonDestructive = $true
        explicitInvocation = $true
        noRemediation = $true
        platformSkepticism = $true
        failuresCapturedAsData = $true
    }
    notes = "Verification harness executed. Introspection failures captured as evidence. No host mutation performed."
    outputs = [ordered]@{
        environment = [ordered]@{
            path = $environmentPath
            sha256 = (Get-Hash $environmentPath)
        }
        executionContext = [ordered]@{
            path = $executionContextPath
            sha256 = (Get-Hash $executionContextPath)
        }
    }
    findings = [ordered]@{
        executionPolicyIntrospection = [ordered]@{
            ok = $execPolicy.ok
            error = $execPolicy.error
        }
        osIntrospection = [ordered]@{
            ok = $osInfo.ok
            error = $osInfo.error
        }
    }
}

Write-Json -Object $runEvidence -Path $runPath

Write-Output "WFSL verification run completed. Evidence written to: $EvidenceRoot"
Write-Output "Run artefact: $runPath"

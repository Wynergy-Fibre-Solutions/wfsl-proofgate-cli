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

# Ensure evidence directory exists
New-DirectorySafe $EvidenceRoot

# Environment evidence
$environment = @{
    timestamp = (Get-Date).ToString("o")
    os = (Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber)
    powershell = @{
        edition = $PSVersionTable.PSEdition
        version = $PSVersionTable.PSVersion.ToString()
    }
    user = $env:USERNAME
    isAdmin = ([Security.Principal.WindowsPrincipal] `
        [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

$environmentPath = Join-Path $EvidenceRoot "environment.json"
$environment | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $environmentPath

# Execution context evidence
$executionContext = @{
    invocation = $MyInvocation.Line
    scriptPath = $MyInvocation.MyCommand.Path
    executionPolicy = Get-ExecutionPolicy -List
}

$executionContextPath = Join-Path $EvidenceRoot "execution-context.json"
$executionContext | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $executionContextPath

# Run evidence
$runEvidence = @{
    timestamp = (Get-Date).ToString("o")
    status = "success"
    notes = "Verification harness executed without mutation."
    hashes = @{
        environment = Get-Hash $environmentPath
        executionContext = Get-Hash $executionContextPath
    }
}

$runPath = Join-Path $EvidenceRoot "run-001.json"
$runEvidence | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $runPath

Write-Output "WFSL verification run completed. Evidence written to $EvidenceRoot"

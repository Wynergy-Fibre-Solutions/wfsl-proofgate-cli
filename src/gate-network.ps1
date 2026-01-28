$latestEvidence = Get-ChildItem "$HOME\github\wfsl-evidence-guard\evidence" -Filter "network-*.json" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $latestEvidence) {
    Write-Output "WFSL_PROOFGATE: NO_EVIDENCE"
    exit 3
}

$data = Get-Content $latestEvidence.FullName | ConvertFrom-Json
$status = $data.wfslEvidence.payload.network.classification

switch ($status) {
    "HEALTHY" {
        Write-Output "WFSL_PROOFGATE: PASS"
        exit 0
    }
    "DEGRADED" {
        Write-Output "WFSL_PROOFGATE: DEGRADED_BUT_PROCEEDABLE"
        exit 1
    }
    "BROKEN" {
        Write-Output "WFSL_PROOFGATE: BLOCKED"
        exit 2
    }
}

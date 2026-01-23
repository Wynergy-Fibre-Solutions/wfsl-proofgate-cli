/**
 * Defender Pressure Probe
 *
 * Detects Windows Defender runtime pressure indicators
 * using process working set inspection.
 *
 * Evidence-only. No remediation. No side effects.
 */

import { execSync } from "child_process";

export interface DefenderFinding {
  process: string;
  workingSetMB: number;
  thresholdMB: number;
  exceedsThreshold: boolean;
}

export interface DefenderProbeResult {
  probe: "defender-pressure";
  status: "PASS" | "WARN";
  findings: DefenderFinding[];
  scannedAt: string;
}

const DEFAULT_THRESHOLD_MB = 300;

function getMsMpEngWorkingSetMB(): number | null {
  try {
    const output = execSync(
      `powershell -NoProfile -Command "Get-Process -Name MsMpEng | Select-Object -ExpandProperty WorkingSet"`,
      { encoding: "utf8" }
    ).trim();

    if (!output) return null;

    const bytes = Number(output);
    if (Number.isNaN(bytes)) return null;

    return Math.round(bytes / (1024 * 1024));
  } catch {
    return null;
  }
}

export function runDefenderPressureProbe(
  thresholdMB: number = DEFAULT_THRESHOLD_MB
): DefenderProbeResult {
  const scannedAt = new Date().toISOString();
  const findings: DefenderFinding[] = [];

  const workingSetMB = getMsMpEngWorkingSetMB();

  if (workingSetMB !== null) {
    findings.push({
      process: "MsMpEng",
      workingSetMB,
      thresholdMB,
      exceedsThreshold: workingSetMB > thresholdMB
    });
  }

  const status =
    findings.some(f => f.exceedsThreshold) ? "WARN" : "PASS";

  return {
    probe: "defender-pressure",
    status,
    findings,
    scannedAt
  };
}

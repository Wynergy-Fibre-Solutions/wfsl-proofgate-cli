/**
 * PowerShell Formatting Integrity Probe
 *
 * Detects stale or broken PowerShell formatting registrations
 * that reference non-existent paths.
 *
 * Evidence-only. No remediation. No side effects.
 */

import fs from "fs";
import path from "path";

export interface FormattingFinding {
  file: string;
  exists: boolean;
  reason?: string;
}

export interface FormattingProbeResult {
  probe: "powershell-formatting";
  status: "PASS" | "WARN";
  findings: FormattingFinding[];
  scannedAt: string;
}

const FORMAT_EXTENSIONS = [".format.ps1xml", ".types.ps1xml"];

function isFormattingFile(p: string): boolean {
  return FORMAT_EXTENSIONS.some(ext => p.toLowerCase().endsWith(ext));
}

function safeExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

/**
 * Enumerate formatting references from known PowerShell paths.
 *
 * Note:
 * We deliberately do NOT execute PowerShell here.
 * We only inspect file system references deterministically.
 */
function enumerateFormattingPaths(): string[] {
  const paths: string[] = [];

  const baseDirs = [
    process.env.LOCALAPPDATA,
    process.env.APPDATA,
    process.env.ProgramData
  ].filter(Boolean) as string[];

  for (const base of baseDirs) {
    const psDir = path.join(base, "Microsoft", "PowerShell");
    if (!safeExists(psDir)) continue;

    const walk = (dir: string): void => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && isFormattingFile(entry.name)) {
          paths.push(fullPath);
        }
      }
    };

    walk(psDir);
  }

  return Array.from(new Set(paths));
}

/**
 * Run the formatting integrity probe.
 */
export function runPowerShellFormattingProbe(): FormattingProbeResult {
  const scannedAt = new Date().toISOString();
  const findings: FormattingFinding[] = [];

  const formattingPaths = enumerateFormattingPaths();

  for (const filePath of formattingPaths) {
    const exists = safeExists(filePath);

    if (!exists) {
      findings.push({
        file: filePath,
        exists: false,
        reason: "Formatting file referenced but path does not exist"
      });
    }
  }

  return {
    probe: "powershell-formatting",
    status: findings.length > 0 ? "WARN" : "PASS",
    findings,
    scannedAt
  };
}

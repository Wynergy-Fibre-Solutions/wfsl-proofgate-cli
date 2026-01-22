import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export type RepoGuardVerdict = {
  repoState: "VALID" | "INVALID";
  lockfile: "IN_SYNC" | "OUT_OF_SYNC" | "NOT_REQUIRED";
  gitignore: "TRACKED" | "MISSING" | "UNTRACKED" | "NOT_REQUIRED";
  buildOutput: "IGNORED" | "TRACKED" | "NOT_APPLICABLE";
  violations: string[];
};

function readTextStrict(p: string, label: string): string {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    throw new Error(`NOT_FOUND: ${label} not found at ${p}`);
  }
}

function parseJsonStrict(text: string, label: string): any {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`PARSE_ERROR: ${label} is not valid JSON`);
  }
}

function tryGit(cmd: string, cwd: string): { ok: true; out: string } | { ok: false; err: string } {
  try {
    const out = execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"] })
      .toString("utf8")
      .trim();
    return { ok: true, out };
  } catch (e: any) {
    const msg = String(e?.stderr?.toString?.("utf8") ?? e?.message ?? e);
    return { ok: false, err: msg.trim() };
  }
}

function getManifestRepoGuard(manifestPath: string): any | null {
  const manifestText = readTextStrict(manifestPath, "manifest");
  const manifest = parseJsonStrict(manifestText, "manifest");
  const guard = manifest?.repoGuard;
  return guard && typeof guard === "object" ? guard : null;
}

function compareDeclaredDepsToLock(
  pkgJsonPath: string,
  lockJsonPath: string
): { inSync: boolean; mismatches: string[] } {
  const mismatches: string[] = [];

  const pkg = parseJsonStrict(readTextStrict(pkgJsonPath, "package.json"), "package.json");
  const lock = parseJsonStrict(readTextStrict(lockJsonPath, "package-lock.json"), "package-lock.json");

  const lockRoot = lock?.packages?.[""];
  const lockDeps = lockRoot?.dependencies ?? {};
  const lockDev = lockRoot?.devDependencies ?? {};
  const lockOpt = lockRoot?.optionalDependencies ?? {};

  const pkgDeps = pkg?.dependencies ?? {};
  const pkgDev = pkg?.devDependencies ?? {};
  const pkgOpt = pkg?.optionalDependencies ?? {};

  const checkGroup = (label: string, pkgGroup: Record<string, string>, lockGroup: Record<string, string>) => {
    for (const [k, v] of Object.entries(pkgGroup)) {
      const lv = lockGroup?.[k];
      if (typeof lv !== "string") {
        mismatches.push(`${label}: '${k}' missing in lockfile root`);
        continue;
      }
      if (String(lv).trim() !== String(v).trim()) {
        mismatches.push(`${label}: '${k}' package.json=${v} lockfile=${lv}`);
      }
    }
  };

  checkGroup("dependencies", pkgDeps, lockDeps);
  checkGroup("devDependencies", pkgDev, lockDev);
  checkGroup("optionalDependencies", pkgOpt, lockOpt);

  return { inSync: mismatches.length === 0, mismatches };
}

export function runRepoGuard(manifestPath: string): RepoGuardVerdict {
  const baseDir = path.dirname(manifestPath);
  const violations: string[] = [];

  const guard = (() => {
    try {
      return getManifestRepoGuard(manifestPath);
    } catch (e: any) {
      return null;
    }
  })();

  if (!guard) {
    return {
      repoState: "VALID",
      lockfile: "NOT_REQUIRED",
      gitignore: "NOT_REQUIRED",
      buildOutput: "NOT_APPLICABLE",
      violations: []
    };
  }

  // GITIGNORE
  let gitignore: RepoGuardVerdict["gitignore"] = "NOT_REQUIRED";
  if (guard?.git?.requireGitignore === true) {
    const giPath = path.join(baseDir, ".gitignore");
    if (!fs.existsSync(giPath)) {
      gitignore = "MISSING";
      violations.push(".gitignore missing");
    } else {
      const res = tryGit("git ls-files --error-unmatch .gitignore", baseDir);
      if (res.ok) {
        gitignore = "TRACKED";
      } else {
        gitignore = "UNTRACKED";
        violations.push(".gitignore exists but is not tracked");
      }
    }
  }

  // LOCKFILE
  let lockfile: RepoGuardVerdict["lockfile"] = "NOT_REQUIRED";
  if (guard?.dependencies?.lockfileRequired === true) {
    const pkgPath = path.join(baseDir, "package.json");
    const lockPath = path.join(baseDir, "package-lock.json");

    if (!fs.existsSync(pkgPath) || !fs.existsSync(lockPath)) {
      lockfile = "OUT_OF_SYNC";
      violations.push("package.json or package-lock.json missing");
    } else {
      const { inSync, mismatches } = compareDeclaredDepsToLock(pkgPath, lockPath);
      lockfile = inSync ? "IN_SYNC" : "OUT_OF_SYNC";
      if (!inSync) {
        for (const m of mismatches.slice(0, 25)) violations.push(`lockfile mismatch: ${m}`);
        if (mismatches.length > 25) violations.push(`lockfile mismatch: +${mismatches.length - 25} more`);
      }
    }
  }

  // BUILD OUTPUT TRACKING
  let buildOutput: RepoGuardVerdict["buildOutput"] = "NOT_APPLICABLE";
  if (guard?.build?.output && typeof guard.build.tracked === "boolean") {
    const outDir = String(guard.build.output);
    const trackedRes = tryGit(`git ls-files ${outDir}`, baseDir);
    const isTracked = trackedRes.ok && trackedRes.out.length > 0;

    if (guard.build.tracked === false) {
      if (isTracked) {
        buildOutput = "TRACKED";
        violations.push(`build output '${outDir}' is tracked but must be ignored`);
      } else {
        buildOutput = "IGNORED";
      }
    } else {
      buildOutput = isTracked ? "TRACKED" : "TRACKED";
    }
  }

  return {
    repoState: violations.length === 0 ? "VALID" : "INVALID",
    lockfile,
    gitignore,
    buildOutput,
    violations
  };
}

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import nacl from "tweetnacl";
import { ExitCode, fail } from "../lib/exit-codes.js";

type VerifyResult =
  | { ok: true; reason: string; details?: Record<string, unknown> }
  | { ok: false; reason: string; details?: Record<string, unknown> };

type RepoGuardVerdict = {
  repoState: "VALID" | "INVALID";
  lockfile: "IN_SYNC" | "OUT_OF_SYNC" | "NOT_REQUIRED";
  gitignore: "TRACKED" | "MISSING" | "UNTRACKED" | "NOT_REQUIRED";
  buildOutput: "IGNORED" | "TRACKED" | "NOT_APPLICABLE";
  violations: string[];
};

function readFileStrict(p: string, label: string): Buffer {
  try {
    return fs.readFileSync(p);
  } catch {
    fail(ExitCode.NotFound, `NOT_FOUND: ${label} not found at ${p}`);
  }
}

function parseJsonStrict(buf: Buffer, label: string): any {
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    fail(ExitCode.ParseError, `PARSE_ERROR: ${label} is not valid JSON`);
  }
}

function execGit(cmd: string): string {
  const { execSync } = require("node:child_process");
  return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
    .toString("utf8")
    .trim();
}

function enforceRepoGuard(manifestPath: string): RepoGuardVerdict {
  const violations: string[] = [];
  const baseDir = path.dirname(manifestPath);

  const manifest = parseJsonStrict(
    readFileStrict(manifestPath, "manifest"),
    "manifest"
  );

  const guard = manifest.repoGuard;
  if (!guard) {
    return {
      repoState: "VALID",
      lockfile: "NOT_REQUIRED",
      gitignore: "NOT_REQUIRED",
      buildOutput: "NOT_APPLICABLE",
      violations: []
    };
  }

  // --- gitignore enforcement ---
  let gitignoreStatus: RepoGuardVerdict["gitignore"] = "NOT_REQUIRED";
  if (guard.git?.requireGitignore) {
    const giPath = path.join(baseDir, ".gitignore");
    if (!fs.existsSync(giPath)) {
      gitignoreStatus = "MISSING";
      violations.push(".gitignore missing");
    } else {
      const tracked = execGit("git ls-files --error-unmatch .gitignore");
      gitignoreStatus = tracked ? "TRACKED" : "UNTRACKED";
      if (gitignoreStatus === "UNTRACKED") {
        violations.push(".gitignore exists but is not tracked");
      }
    }
  }

  // --- lockfile enforcement ---
  let lockfileStatus: RepoGuardVerdict["lockfile"] = "NOT_REQUIRED";
  if (guard.dependencies?.lockfileRequired) {
    const pkg = path.join(baseDir, "package.json");
    const lock = path.join(baseDir, "package-lock.json");
    if (!fs.existsSync(pkg) || !fs.existsSync(lock)) {
      lockfileStatus = "OUT_OF_SYNC";
      violations.push("package.json or package-lock.json missing");
    } else {
      lockfileStatus = "IN_SYNC";
    }
  }

  // --- build output enforcement ---
  let buildStatus: RepoGuardVerdict["buildOutput"] = "NOT_APPLICABLE";
  if (guard.build?.output && typeof guard.build.tracked === "boolean") {
    const output = guard.build.output;
    const tracked =
      execGit(`git ls-files ${output}`).length > 0;

    if (guard.build.tracked === false && tracked) {
      buildStatus = "TRACKED";
      violations.push(`build output '${output}' is tracked but must be ignored`);
    } else if (guard.build.tracked === false) {
      buildStatus = "IGNORED";
    } else {
      buildStatus = "TRACKED";
    }
  }

  return {
    repoState: violations.length === 0 ? "VALID" : "INVALID",
    lockfile: lockfileStatus,
    gitignore: gitignoreStatus,
    buildOutput: buildStatus,
    violations
  };
}

function cleanBase64FromFile(filePath: string): string {
  return readFileStrict(filePath, "base64").toString("ascii").replace(/[^A-Za-z0-9+/=]/g, "");
}

function b64ToU8(b64: string, label: string): Uint8Array {
  try {
    return new Uint8Array(Buffer.from(b64, "base64"));
  } catch {
    fail(ExitCode.InvalidInput, `INVALID_INPUT: ${label} is not valid base64`);
  }
}

function fallbackVerify(manifestPath: string, publicKeyPath?: string): VerifyResult {
  const baseDir = path.dirname(manifestPath);
  const manifest = parseJsonStrict(readFileStrict(manifestPath, "manifest"), "manifest");

  const msg = readFileStrict(path.resolve(baseDir, manifest.messageFile), "messageFile");
  const sig = b64ToU8(
    cleanBase64FromFile(path.resolve(baseDir, manifest.signatureFile)),
    "signature"
  );
  const pk = b64ToU8(
    publicKeyPath
      ? cleanBase64FromFile(publicKeyPath)
      : cleanBase64FromFile(path.resolve(baseDir, manifest.publicKeyFile)),
    "publicKey"
  );

  const ok = nacl.sign.detached.verify(new Uint8Array(msg), sig, pk);
  return ok
    ? { ok: true, reason: "verified", details: { verifier: "builtin" } }
    : { ok: false, reason: "signature verification failed" };
}

export async function runVerify(argv: string[]): Promise<void> {
  const i = argv.indexOf("--manifest");
  if (i === -1 || !argv[i + 1]) {
    fail(ExitCode.Usage, "USAGE: --manifest <path> is required");
  }

  const manifestPath = path.resolve(process.cwd(), argv[i + 1]);

  const verdict = enforceRepoGuard(manifestPath);
  if (verdict.repoState === "INVALID") {
    process.stderr.write(
      `REPO_GUARD_FAILED\n${JSON.stringify(verdict, null, 2)}\n`
    );
    process.exit(ExitCode.VerifyFailed);
  }

  const result = fallbackVerify(manifestPath);
  if (!result.ok) {
    process.stderr.write(`VERIFY_FAILED: ${result.reason}\n`);
    process.exit(ExitCode.VerifyFailed);
  }

  process.stdout.write(`OK: ${result.reason}\n`);
  process.exit(ExitCode.Ok);
}

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import nacl from "tweetnacl";
import { ExitCode, fail } from "../lib/exit-codes.js";
import { runRepoGuard } from "../lib/repo-guard.js";

type VerifyResult =
  | { ok: true; reason: string; details?: Record<string, unknown> }
  | { ok: false; reason: string; details?: Record<string, unknown> };

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

function cleanBase64FromFile(filePath: string, label: string): string {
  const raw = readFileStrict(filePath, label);
  return raw.toString("ascii").replace(/[^A-Za-z0-9+/=]/g, "");
}

function cleanBase64Inline(value: string): string {
  return String(value ?? "").toString().replace(/[^A-Za-z0-9+/=]/g, "");
}

function b64ToU8(b64: string, label: string): Uint8Array {
  try {
    const raw = Buffer.from(b64, "base64");
    return new Uint8Array(raw);
  } catch {
    fail(ExitCode.InvalidInput, `INVALID_INPUT: ${label} is not valid base64`);
  }
}

function normalisePath(p: string, baseDir: string): string {
  return path.isAbsolute(p) ? p : path.resolve(baseDir, p);
}

function isVerifyResult(x: any): x is VerifyResult {
  if (!x || typeof x !== "object") return false;
  if (typeof x.ok !== "boolean") return false;
  if (typeof x.reason !== "string") return false;
  if ("details" in x && x.details != null && typeof x.details !== "object") return false;
  return true;
}

async function tryExternalVerifier(
  verifierArg: string | undefined,
  manifestPath: string,
  publicKeyPath: string | undefined
): Promise<VerifyResult | null> {
  if (!verifierArg) return null;

  const token = String(verifierArg).trim();
  if (!token || token.toLowerCase() === "none") return null;

  const candidate = path.resolve(process.cwd(), token);
  if (!fs.existsSync(candidate)) {
    return { ok: false, reason: `external verifier not found at ${candidate}` };
  }

  try {
    const mod = await import(pathToFileURL(candidate).toString());
    const fn =
      (mod.verifyExternalManifest as any) ??
      (mod.verify as any) ??
      (mod.default as any);

    if (typeof fn !== "function") {
      return {
        ok: false,
        reason: "external verifier loaded but no valid export found (verifyExternalManifest, verify, or default)"
      };
    }

    const res = await fn(manifestPath, { publicKeyPath });
    if (!isVerifyResult(res)) {
      return {
        ok: false,
        reason: "external verifier returned invalid result shape (expected { ok: boolean, reason: string, details?: object })"
      };
    }

    return res;
  } catch (e: any) {
    return { ok: false, reason: `external verifier threw: ${String(e?.message ?? e)}` };
  }
}

function fallbackVerify(manifestPath: string, publicKeyPathArg?: string): VerifyResult {
  const baseDir = path.dirname(manifestPath);
  const manifest = parseJsonStrict(readFileStrict(manifestPath, "manifest"), "manifest");

  const messageFile = String(manifest.messageFile ?? "");
  if (!messageFile) return { ok: false, reason: "manifest missing required field: messageFile" };

  const msg = readFileStrict(normalisePath(messageFile, baseDir), "messageFile");

  let signatureB64 = "";
  if (typeof manifest.signatureFile === "string" && manifest.signatureFile.length > 0) {
    signatureB64 = cleanBase64FromFile(normalisePath(manifest.signatureFile, baseDir), "signatureFile");
  } else if (typeof manifest.signatureB64 === "string" && manifest.signatureB64.length > 0) {
    signatureB64 = cleanBase64Inline(manifest.signatureB64);
  }
  if (!signatureB64) return { ok: false, reason: "no signature provided (signatureFile or signatureB64)" };

  const sig = b64ToU8(signatureB64, "signature");
  if (sig.length !== 64) {
    return { ok: false, reason: `signature must be 64 bytes (Ed25519 detached). Got ${sig.length} bytes.` };
  }

  let pkB64 = "";
  if (publicKeyPathArg) {
    pkB64 = cleanBase64FromFile(normalisePath(publicKeyPathArg, process.cwd()), "public key");
  } else if (typeof manifest.publicKeyFile === "string" && manifest.publicKeyFile.length > 0) {
    pkB64 = cleanBase64FromFile(normalisePath(manifest.publicKeyFile, baseDir), "publicKeyFile");
  } else if (typeof manifest.publicKeyB64 === "string" && manifest.publicKeyB64.length > 0) {
    pkB64 = cleanBase64Inline(manifest.publicKeyB64);
  }
  if (!pkB64) return { ok: false, reason: "no public key provided (--public-key, publicKeyFile, or publicKeyB64)" };

  const pk = b64ToU8(pkB64, "public key");
  if (pk.length !== 32) {
    return { ok: false, reason: `public key must be 32 bytes (Ed25519). Got ${pk.length} bytes.` };
  }

  const ok = nacl.sign.detached.verify(new Uint8Array(msg), sig, pk);
  if (!ok) return { ok: false, reason: "signature verification failed" };

  return { ok: true, reason: "verified", details: { verifier: "builtin-fallback" } };
}

function parseArgs(argv: string[]) {
  const out: any = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--manifest") out.manifestPath = argv[++i];
    else if (a === "--public-key") out.publicKeyPath = argv[++i];
    else if (a === "--verifier") out.verifierPath = argv[++i];
    else if (a === "--help" || a === "-h") out.help = true;
    else {
      out.unknown ??= [];
      out.unknown.push(a);
    }
  }
  return out;
}

export async function runVerify(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  if (args.help) {
    process.stdout.write(
      [
        "WFSL ProofGate — verify",
        "",
        "Usage:",
        "  wfsl-proofgate verify --manifest <path> [--public-key <path>] [--verifier <path|none>]",
        "",
        "Repo Guard:",
        "  Runs before verification when manifest contains repoGuard.",
        "",
        "Exit codes:",
        "  0  OK",
        "  10 USAGE",
        "  20 VERIFY_FAILED",
        "  30 INTERNAL_ERROR",
        "  40 NOT_FOUND",
        "  41 INVALID_INPUT",
        "  42 PARSE_ERROR",
        ""
      ].join("\n")
    );
    process.exit(ExitCode.Ok);
  }

  if (Array.isArray(args.unknown) && args.unknown.length > 0) {
    fail(ExitCode.Usage, `USAGE: unknown args: ${args.unknown.join(" ")}`);
  }

  if (!args.manifestPath) {
    fail(ExitCode.Usage, "USAGE: --manifest <path> is required");
  }

  const manifestPath = path.resolve(process.cwd(), args.manifestPath);
  if (!fs.existsSync(manifestPath)) {
    fail(ExitCode.NotFound, `NOT_FOUND: manifest not found at ${manifestPath}`);
  }

  const verdict = runRepoGuard(manifestPath);
  if (verdict.repoState === "INVALID") {
    process.stderr.write(`REPO_GUARD_FAILED\n${JSON.stringify(verdict, null, 2)}\n`);
    process.exit(ExitCode.VerifyFailed);
  }

  const external = await tryExternalVerifier(args.verifierPath, manifestPath, args.publicKeyPath);
  const result = external ?? fallbackVerify(manifestPath, args.publicKeyPath);

  if (result.ok) {
    process.stdout.write(`OK: ${result.reason}\n`);
    process.exit(ExitCode.Ok);
  }

  process.stderr.write(`VERIFY_FAILED: ${result.reason}\n`);
  if (result.details) process.stderr.write(`${JSON.stringify(result.details)}\n`);
  process.exit(ExitCode.VerifyFailed);
}

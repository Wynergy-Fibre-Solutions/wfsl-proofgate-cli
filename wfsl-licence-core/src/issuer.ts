// wfsl-licence-core/src/issuer.ts

import * as fs from "fs";
import * as path from "path";
import { createHash, createPrivateKey, sign as signDetached, randomUUID } from "crypto";
import { wfslError } from "./errors";
import { WfslEntitlement } from "./verifyToken";

export interface IssueTokenParams {
  readonly subject: string;
  readonly plan: "community" | "pro" | string;
  readonly features?: readonly string[];
  readonly policy?: string;
  readonly expiresAtEpochSeconds: number;
  readonly issuer?: string; // defaults to "wfsl"
}

export interface IssuedToken {
  readonly token: string;
  readonly payload: WfslEntitlement;
  readonly signatureBase64: string;
}

export interface IssuanceLogEntry {
  readonly ts: string;
  readonly jti: string;
  readonly sub: string;
  readonly plan: string;
  readonly exp: number;
  readonly featuresCount: number;
  readonly policy?: string;
  readonly payloadHash: string; // sha256:...
  readonly tokenHash: string; // sha256:...
  readonly prev?: string; // previous entry hash
  readonly entryHash: string; // sha256(prev + payloadHash + tokenHash + ts + jti)
}

function sha256Hex(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}

function prefixedSha256(input: Buffer | string): string {
  return `sha256:${sha256Hex(input)}`;
}

/**
 * Load WFSL private signing key (Ed25519).
 * NEVER commit private keys.
 */
export function loadSigningKeyPem(): string {
  const keyPath =
    process.env.WFSL_SIGNING_KEY_PATH ||
    path.join(__dirname, "..", "keys", "wfsl_private_key.pem");

  try {
    const pem = fs.readFileSync(keyPath, "utf8");
    if (!pem || pem.trim().length === 0) throw new Error("empty key");
    return pem;
  } catch {
    throw wfslError("WFSL_CONFIG_ERROR", {
      detail: "Unable to load WFSL signing key.",
      hint: "Set WFSL_SIGNING_KEY_PATH to a valid Ed25519 private key PEM."
    });
  }
}

/**
 * Create an entitlement payload (strict v1).
 */
export function buildEntitlement(params: IssueTokenParams): WfslEntitlement {
  const iss = (params.issuer ?? "wfsl").trim();
  const sub = params.subject.trim();

  if (!iss) {
    throw wfslError("WFSL_CONFIG_ERROR", { detail: "Issuer (iss) is required." });
  }
  if (!sub) {
    throw wfslError("WFSL_CONFIG_ERROR", { detail: "Subject (sub) is required." });
  }
  if (!params.plan) {
    throw wfslError("WFSL_CONFIG_ERROR", { detail: "Plan is required." });
  }
  if (!Number.isFinite(params.expiresAtEpochSeconds) || params.expiresAtEpochSeconds <= 0) {
    throw wfslError("WFSL_CONFIG_ERROR", { detail: "exp must be a valid epoch seconds number." });
  }

  const now = Math.floor(Date.now() / 1000);
  if (params.expiresAtEpochSeconds <= now) {
    throw wfslError("WFSL_CONFIG_ERROR", {
      detail: "exp must be in the future."
    });
  }

  const features = (params.features ?? []).map((f) => String(f).trim()).filter(Boolean);

  const payload: WfslEntitlement = {
    iss,
    sub,
    plan: params.plan,
    features: features.length > 0 ? features : undefined,
    policy: params.policy?.trim() ? params.policy.trim() : undefined,
    exp: params.expiresAtEpochSeconds,
    jti: randomUUID(),
    version: "v1"
  };

  return payload;
}

/**
 * Sign payload with Ed25519 and return token parts.
 * Token format: base64(payload).base64(signature)
 */
export function issueToken(payload: WfslEntitlement, privateKeyPem: string): IssuedToken {
  const payloadJson = JSON.stringify(payload);
  const payloadBuf = Buffer.from(payloadJson, "utf8");

  try {
    const key = createPrivateKey(privateKeyPem);
    const sig = signDetached(null, payloadBuf, key);
    const token = `${payloadBuf.toString("base64")}.${sig.toString("base64")}`;

    return {
      token,
      payload,
      signatureBase64: sig.toString("base64")
    };
  } catch {
    throw wfslError("WFSL_INTERNAL_ERROR", {
      detail: "Failed to sign token.",
      hint: "Confirm the private key is a valid Ed25519 key PEM."
    });
  }
}

function readLastLogEntryHash(logPath: string): string | undefined {
  if (!fs.existsSync(logPath)) return undefined;

  const raw = fs.readFileSync(logPath, "utf8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return undefined;

  try {
    const last = JSON.parse(lines[lines.length - 1]) as IssuanceLogEntry;
    return last.entryHash;
  } catch {
    // If log is corrupt, do not silently continue.
    throw wfslError("WFSL_TAMPER_DETECTED", {
      detail: "Issuance log is not valid JSONL.",
      hint: "Repair or rotate the issuance log before issuing new tokens."
    });
  }
}

/**
 * Append-only issuance log with a simple hash chain.
 * This is not secret, but it is tamper-evident.
 */
export function appendIssuanceLog(params: {
  readonly logPath: string;
  readonly payload: WfslEntitlement;
  readonly token: string;
}): IssuanceLogEntry {
  const ts = new Date().toISOString();
  const prev = readLastLogEntryHash(params.logPath);

  const payloadHash = prefixedSha256(JSON.stringify(params.payload));
  const tokenHash = prefixedSha256(params.token);

  const entryMaterial = `${prev ?? ""}|${payloadHash}|${tokenHash}|${ts}|${params.payload.jti ?? ""}`;
  const entryHash = prefixedSha256(entryMaterial);

  const entry: IssuanceLogEntry = {
    ts,
    jti: params.payload.jti ?? "",
    sub: params.payload.sub,
    plan: params.payload.plan,
    exp: params.payload.exp,
    featuresCount: params.payload.features?.length ?? 0,
    policy: params.payload.policy,
    payloadHash,
    tokenHash,
    prev,
    entryHash
  };

  const dir = path.dirname(params.logPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(params.logPath, `${JSON.stringify(entry)}\n`, "utf8");

  return entry;
}

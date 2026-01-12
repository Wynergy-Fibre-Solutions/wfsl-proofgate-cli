// wfsl-licence-core/src/verifyToken.ts

import { createPublicKey, verify as verifySignature } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { wfslError } from "./errors";

export interface WfslEntitlement {
  readonly iss: string;
  readonly sub: string;
  readonly plan: "community" | "pro" | string;
  readonly features?: readonly string[];
  readonly policy?: string;
  readonly exp: number;
  readonly jti?: string;
  readonly version: "v1";
}

export interface VerifiedAuthority {
  readonly subject: string;
  readonly plan: string;
  readonly features: readonly string[];
  readonly policy?: string;
  readonly expiresAt: number;
  readonly tokenId?: string;
}

export function loadToken(): string {
  const envToken = process.env.WFSL_LICENCE_TOKEN;
  if (envToken && envToken.trim().length > 0) {
    return envToken.trim();
  }

  const filePath = process.env.WFSL_LICENCE_TOKEN_FILE;
  if (!filePath) {
    throw wfslError("WFSL_LICENCE_MISSING", {
      hint: "Set WFSL_LICENCE_TOKEN or WFSL_LICENCE_TOKEN_FILE."
    });
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw || raw.trim().length === 0) {
      throw new Error("empty token file");
    }
    return raw.trim();
  } catch {
    throw wfslError("WFSL_IO_ERROR", {
      detail: "Unable to read licence token file."
    });
  }
}

function loadPublicKey(): string {
  const keyPath =
    process.env.WFSL_PUBLIC_KEY_PATH ??
    path.join(__dirname, "..", "keys", "wfsl_public_key.pem");

  try {
    const pem = fs.readFileSync(keyPath, "utf8");
    if (!pem || pem.trim().length === 0) {
      throw new Error("empty public key");
    }
    return pem;
  } catch {
    throw wfslError("WFSL_CONFIG_ERROR", {
      detail: "Public verification key is missing. Set WFSL_PUBLIC_KEY_PATH."
    });
  }
}

function verifyEd25519(payload: Buffer, signature: Buffer, publicKeyPem: string): boolean {
  const key = createPublicKey(publicKeyPem);
  return verifySignature(null, payload, key, signature);
}

export function verifyToken(token: string, publicKeyPem?: string): VerifiedAuthority {
  if (!token || token.length === 0) {
    throw wfslError("WFSL_LICENCE_MISSING");
  }

  const keyPem = publicKeyPem ?? loadPublicKey();

  const parts = token.split(".");
  if (parts.length !== 2) {
    throw wfslError("WFSL_LICENCE_INVALID", {
      detail: "Token must be payload.signature"
    });
  }

  let payloadBuf: Buffer;
  let sigBuf: Buffer;

  try {
    payloadBuf = Buffer.from(parts[0], "base64");
    sigBuf = Buffer.from(parts[1], "base64");
  } catch {
    throw wfslError("WFSL_LICENCE_INVALID", {
      detail: "Token is not valid base64."
    });
  }

  let payload: WfslEntitlement;
  try {
    payload = JSON.parse(payloadBuf.toString("utf8"));
  } catch {
    throw wfslError("WFSL_LICENCE_INVALID", {
      detail: "Payload is not valid JSON."
    });
  }

  if (payload.version !== "v1") {
    throw wfslError("WFSL_POLICY_MISMATCH", {
      detail: "Unsupported entitlement version."
    });
  }

  const verified = verifyEd25519(payloadBuf, sigBuf, keyPem);
  if (!verified) {
    throw wfslError("WFSL_LICENCE_INVALID", {
      detail: "Signature verification failed."
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw wfslError("WFSL_LICENCE_EXPIRED");
  }

  if (!payload.sub || !payload.plan) {
    throw wfslError("WFSL_LICENCE_INVALID", {
      detail: "Required entitlement fields missing."
    });
  }

  return {
    subject: payload.sub,
    plan: payload.plan,
    features: payload.features ?? [],
    policy: payload.policy,
    expiresAt: payload.exp,
    tokenId: payload.jti
  };
}

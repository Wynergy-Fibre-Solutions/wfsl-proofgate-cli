// wfsl-licence-core/src/receipt.ts

import { createSign } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { wfslError } from "./errors";
import { VerifiedAuthority } from "./verifyToken";

/**
 * Receipt payload issued for Pro executions.
 * This is what makes outputs authoritative.
 */
export interface WfslReceipt {
  readonly tool: string;
  readonly toolVersion: string;
  readonly licenceSubject: string;
  readonly plan: string;
  readonly policy?: string;
  readonly outputHash: string;
  readonly issuedAt: string;
}

/**
 * Load WFSL private signing key.
 * This must NEVER be bundled in public distributions.
 */
function loadSigningKey(): string {
  const keyPath =
    process.env.WFSL_SIGNING_KEY_PATH ||
    path.join(__dirname, "..", "keys", "wfsl_private_key.pem");

  try {
    const key = fs.readFileSync(keyPath, "utf8");
    if (!key || key.trim().length === 0) {
      throw new Error("empty signing key");
    }
    return key;
  } catch {
    throw wfslError("WFSL_CONFIG_ERROR", {
      detail: "Unable to load WFSL signing key."
    });
  }
}

/**
 * Create and sign a receipt for a Pro execution.
 */
export function issueReceipt(
  authority: VerifiedAuthority,
  params: {
    tool: string;
    toolVersion: string;
    outputHash: string;
  }
): { receipt: WfslReceipt; signature: string } {
  const receipt: WfslReceipt = {
    tool: params.tool,
    toolVersion: params.toolVersion,
    licenceSubject: authority.subject,
    plan: authority.plan,
    policy: authority.policy,
    outputHash: params.outputHash,
    issuedAt: new Date().toISOString()
  };

  const signer = createSign("sha256");
  signer.update(JSON.stringify(receipt));
  signer.end();

  const privateKey = loadSigningKey();
  const signature = signer.sign(privateKey, "base64");

  return { receipt, signature };
}

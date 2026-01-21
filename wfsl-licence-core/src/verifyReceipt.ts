// wfsl-licence-core/src/verifyReceipt.ts

import { createVerify } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { wfslError } from "./errors";
import { WfslReceipt } from "./receipt";

/**
 * Load WFSL public verification key.
 * This is safe to distribute.
 */
function loadPublicKey(): string {
  const keyPath =
    process.env.WFSL_PUBLIC_KEY_PATH ||
    path.join(__dirname, "..", "keys", "wfsl_public_key.pem");

  try {
    const pem = fs.readFileSync(keyPath, "utf8");
    if (!pem || pem.trim().length === 0) {
      throw new Error("empty public key");
    }
    return pem;
  } catch {
    throw wfslError("WFSL_CONFIG_ERROR", {
      detail: "Unable to load WFSL public verification key."
    });
  }
}

/**
 * Verify a signed receipt and return the receipt on success.
 * Throws WfslError on any verification failure.
 */
export function verifyReceipt(
  receipt: WfslReceipt,
  signatureBase64: string
): WfslReceipt {
  if (!receipt || !signatureBase64) {
    throw wfslError("WFSL_CONFIG_ERROR", {
      detail: "Receipt and signature are required."
    });
  }

  const verifier = createVerify("sha256");
  verifier.update(JSON.stringify(receipt));
  verifier.end();

  const publicKey = loadPublicKey();
  const ok = verifier.verify(publicKey, signatureBase64, "base64");

  if (!ok) {
    throw wfslError("WFSL_TAMPER_DETECTED", {
      detail: "Receipt signature verification failed."
    });
  }

  return receipt;
}

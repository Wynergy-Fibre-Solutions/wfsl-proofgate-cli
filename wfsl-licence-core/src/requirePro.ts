// wfsl-licence-core/src/requirePro.ts

import { wfslError } from "./errors";
import { loadToken, verifyToken, VerifiedAuthority } from "./verifyToken";
import * as fs from "fs";
import * as path from "path";

/**
 * Load the WFSL public key used to verify entitlement signatures.
 * This must be a PUBLIC key only.
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
      detail: "Unable to load WFSL public key."
    });
  }
}

/**
 * Enforce that a valid Pro entitlement exists.
 * Returns verified authority on success.
 * Throws WfslError on failure.
 */
export function requirePro(requiredFeature?: string): VerifiedAuthority {
  const token = loadToken();
  const publicKeyPem = loadPublicKey();

  const authority = verifyToken(token, publicKeyPem);

  if (authority.plan !== "pro") {
    throw wfslError("WFSL_PLAN_INSUFFICIENT", {
      detail: `Plan '${authority.plan}' does not permit Pro operations.`
    });
  }

  if (requiredFeature) {
    if (!authority.features.includes(requiredFeature)) {
      throw wfslError("WFSL_FEATURE_DISABLED", {
        detail: `Required feature '${requiredFeature}' not enabled.`
      });
    }
  }

  return authority;
}

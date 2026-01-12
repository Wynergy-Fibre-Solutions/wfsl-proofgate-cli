"use strict";
// wfsl-licence-core/src/verifyToken.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadToken = loadToken;
exports.verifyToken = verifyToken;
const crypto_1 = require("crypto");
const errors_1 = require("./errors");
/**
 * Load a token from environment or file.
 * Environment takes precedence to support CI safely.
 */
function loadToken() {
    const envToken = process.env.WFSL_LICENCE_TOKEN;
    if (envToken && envToken.trim().length > 0) {
        return envToken.trim();
    }
    const path = process.env.WFSL_LICENCE_TOKEN_FILE;
    if (!path) {
        throw (0, errors_1.wfslError)("WFSL_LICENCE_MISSING", {
            hint: "Set WFSL_LICENCE_TOKEN or WFSL_LICENCE_TOKEN_FILE."
        });
    }
    try {
        const fs = require("fs");
        const raw = fs.readFileSync(path, "utf8");
        if (!raw || raw.trim().length === 0) {
            throw new Error("empty token file");
        }
        return raw.trim();
    }
    catch {
        throw (0, errors_1.wfslError)("WFSL_IO_ERROR", {
            detail: "Unable to read licence token file."
        });
    }
}
/**
 * Verify a detached Ed25519 signature over a payload.
 * Token format: base64(payload).base64(signature)
 */
function verifyEd25519(payload, signature, publicKeyPem) {
    const key = (0, crypto_1.createPublicKey)(publicKeyPem);
    return (0, crypto_1.verify)(null, payload, key, signature);
}
/**
 * Parse, verify, and validate a WFSL entitlement token.
 * Throws WfslError on any failure.
 */
function verifyToken(token, publicKeyPem) {
    if (!token || token.length === 0) {
        throw (0, errors_1.wfslError)("WFSL_LICENCE_MISSING");
    }
    const parts = token.split(".");
    if (parts.length !== 2) {
        throw (0, errors_1.wfslError)("WFSL_LICENCE_INVALID", {
            detail: "Token must be payload.signature"
        });
    }
    let payloadBuf;
    let sigBuf;
    try {
        payloadBuf = Buffer.from(parts[0], "base64");
        sigBuf = Buffer.from(parts[1], "base64");
    }
    catch {
        throw (0, errors_1.wfslError)("WFSL_LICENCE_INVALID", {
            detail: "Token is not valid base64."
        });
    }
    let payload;
    try {
        payload = JSON.parse(payloadBuf.toString("utf8"));
    }
    catch {
        throw (0, errors_1.wfslError)("WFSL_LICENCE_INVALID", {
            detail: "Payload is not valid JSON."
        });
    }
    if (payload.version !== "v1") {
        throw (0, errors_1.wfslError)("WFSL_POLICY_MISMATCH", {
            detail: "Unsupported entitlement version."
        });
    }
    const verified = verifyEd25519(payloadBuf, sigBuf, publicKeyPem);
    if (!verified) {
        throw (0, errors_1.wfslError)("WFSL_LICENCE_INVALID", {
            detail: "Signature verification failed."
        });
    }
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
        throw (0, errors_1.wfslError)("WFSL_LICENCE_EXPIRED");
    }
    if (!payload.sub || !payload.plan) {
        throw (0, errors_1.wfslError)("WFSL_LICENCE_INVALID", {
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

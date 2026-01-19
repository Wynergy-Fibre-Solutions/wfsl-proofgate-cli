"use strict";
// wfsl-licence-core/src/issuer.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSigningKeyPem = loadSigningKeyPem;
exports.buildEntitlement = buildEntitlement;
exports.issueToken = issueToken;
exports.appendIssuanceLog = appendIssuanceLog;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const errors_1 = require("./errors");
function sha256Hex(input) {
    return (0, crypto_1.createHash)("sha256").update(input).digest("hex");
}
function prefixedSha256(input) {
    return `sha256:${sha256Hex(input)}`;
}
/**
 * Load WFSL private signing key (Ed25519).
 * NEVER commit private keys.
 */
function loadSigningKeyPem() {
    const keyPath = process.env.WFSL_SIGNING_KEY_PATH ||
        path.join(__dirname, "..", "keys", "wfsl_private_key.pem");
    try {
        const pem = fs.readFileSync(keyPath, "utf8");
        if (!pem || pem.trim().length === 0)
            throw new Error("empty key");
        return pem;
    }
    catch {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", {
            detail: "Unable to load WFSL signing key.",
            hint: "Set WFSL_SIGNING_KEY_PATH to a valid Ed25519 private key PEM."
        });
    }
}
/**
 * Create an entitlement payload (strict v1).
 */
function buildEntitlement(params) {
    const iss = (params.issuer ?? "wfsl").trim();
    const sub = params.subject.trim();
    if (!iss) {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", { detail: "Issuer (iss) is required." });
    }
    if (!sub) {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", { detail: "Subject (sub) is required." });
    }
    if (!params.plan) {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", { detail: "Plan is required." });
    }
    if (!Number.isFinite(params.expiresAtEpochSeconds) || params.expiresAtEpochSeconds <= 0) {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", { detail: "exp must be a valid epoch seconds number." });
    }
    const now = Math.floor(Date.now() / 1000);
    if (params.expiresAtEpochSeconds <= now) {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", {
            detail: "exp must be in the future."
        });
    }
    const features = (params.features ?? []).map((f) => String(f).trim()).filter(Boolean);
    const payload = {
        iss,
        sub,
        plan: params.plan,
        features: features.length > 0 ? features : undefined,
        policy: params.policy?.trim() ? params.policy.trim() : undefined,
        exp: params.expiresAtEpochSeconds,
        jti: (0, crypto_1.randomUUID)(),
        version: "v1"
    };
    return payload;
}
/**
 * Sign payload with Ed25519 and return token parts.
 * Token format: base64(payload).base64(signature)
 */
function issueToken(payload, privateKeyPem) {
    const payloadJson = JSON.stringify(payload);
    const payloadBuf = Buffer.from(payloadJson, "utf8");
    try {
        const key = (0, crypto_1.createPrivateKey)(privateKeyPem);
        const sig = (0, crypto_1.sign)(null, payloadBuf, key);
        const token = `${payloadBuf.toString("base64")}.${sig.toString("base64")}`;
        return {
            token,
            payload,
            signatureBase64: sig.toString("base64")
        };
    }
    catch {
        throw (0, errors_1.wfslError)("WFSL_INTERNAL_ERROR", {
            detail: "Failed to sign token.",
            hint: "Confirm the private key is a valid Ed25519 key PEM."
        });
    }
}
function readLastLogEntryHash(logPath) {
    if (!fs.existsSync(logPath))
        return undefined;
    const raw = fs.readFileSync(logPath, "utf8");
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0)
        return undefined;
    try {
        const last = JSON.parse(lines[lines.length - 1]);
        return last.entryHash;
    }
    catch {
        // If log is corrupt, do not silently continue.
        throw (0, errors_1.wfslError)("WFSL_TAMPER_DETECTED", {
            detail: "Issuance log is not valid JSONL.",
            hint: "Repair or rotate the issuance log before issuing new tokens."
        });
    }
}
/**
 * Append-only issuance log with a simple hash chain.
 * This is not secret, but it is tamper-evident.
 */
function appendIssuanceLog(params) {
    const ts = new Date().toISOString();
    const prev = readLastLogEntryHash(params.logPath);
    const payloadHash = prefixedSha256(JSON.stringify(params.payload));
    const tokenHash = prefixedSha256(params.token);
    const entryMaterial = `${prev ?? ""}|${payloadHash}|${tokenHash}|${ts}|${params.payload.jti ?? ""}`;
    const entryHash = prefixedSha256(entryMaterial);
    const entry = {
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
//# sourceMappingURL=issuer.js.map
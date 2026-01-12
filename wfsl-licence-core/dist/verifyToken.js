"use strict";
// wfsl-licence-core/src/verifyToken.ts
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
exports.loadToken = loadToken;
exports.verifyToken = verifyToken;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const errors_1 = require("./errors");
function loadToken() {
    const envToken = process.env.WFSL_LICENCE_TOKEN;
    if (envToken && envToken.trim().length > 0) {
        return envToken.trim();
    }
    const filePath = process.env.WFSL_LICENCE_TOKEN_FILE;
    if (!filePath) {
        throw (0, errors_1.wfslError)("WFSL_LICENCE_MISSING", {
            hint: "Set WFSL_LICENCE_TOKEN or WFSL_LICENCE_TOKEN_FILE."
        });
    }
    try {
        const raw = fs.readFileSync(filePath, "utf8");
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
function loadPublicKey() {
    const keyPath = process.env.WFSL_PUBLIC_KEY_PATH ??
        path.join(__dirname, "..", "keys", "wfsl_public_key.pem");
    try {
        const pem = fs.readFileSync(keyPath, "utf8");
        if (!pem || pem.trim().length === 0) {
            throw new Error("empty public key");
        }
        return pem;
    }
    catch {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", {
            detail: "Public verification key is missing. Set WFSL_PUBLIC_KEY_PATH."
        });
    }
}
function verifyEd25519(payload, signature, publicKeyPem) {
    const key = (0, crypto_1.createPublicKey)(publicKeyPem);
    return (0, crypto_1.verify)(null, payload, key, signature);
}
function verifyToken(token, publicKeyPem) {
    if (!token || token.length === 0) {
        throw (0, errors_1.wfslError)("WFSL_LICENCE_MISSING");
    }
    const keyPem = publicKeyPem ?? loadPublicKey();
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
    const verified = verifyEd25519(payloadBuf, sigBuf, keyPem);
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
//# sourceMappingURL=verifyToken.js.map
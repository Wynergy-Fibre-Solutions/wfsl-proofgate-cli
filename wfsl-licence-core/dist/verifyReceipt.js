"use strict";
// wfsl-licence-core/src/verifyReceipt.ts
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
exports.verifyReceipt = verifyReceipt;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const errors_1 = require("./errors");
/**
 * Load WFSL public verification key.
 * This is safe to distribute.
 */
function loadPublicKey() {
    const keyPath = process.env.WFSL_PUBLIC_KEY_PATH ||
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
            detail: "Unable to load WFSL public verification key."
        });
    }
}
/**
 * Verify a signed receipt and return the receipt on success.
 * Throws WfslError on any verification failure.
 */
function verifyReceipt(receipt, signatureBase64) {
    if (!receipt || !signatureBase64) {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", {
            detail: "Receipt and signature are required."
        });
    }
    const verifier = (0, crypto_1.createVerify)("sha256");
    verifier.update(JSON.stringify(receipt));
    verifier.end();
    const publicKey = loadPublicKey();
    const ok = verifier.verify(publicKey, signatureBase64, "base64");
    if (!ok) {
        throw (0, errors_1.wfslError)("WFSL_TAMPER_DETECTED", {
            detail: "Receipt signature verification failed."
        });
    }
    return receipt;
}
//# sourceMappingURL=verifyReceipt.js.map
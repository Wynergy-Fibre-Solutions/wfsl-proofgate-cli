"use strict";
// wfsl-licence-core/src/receipt.ts
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
exports.issueReceipt = issueReceipt;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const errors_1 = require("./errors");
/**
 * Load WFSL private signing key.
 * This must NEVER be bundled in public distributions.
 */
function loadSigningKey() {
    const keyPath = process.env.WFSL_SIGNING_KEY_PATH ||
        path.join(__dirname, "..", "keys", "wfsl_private_key.pem");
    try {
        const key = fs.readFileSync(keyPath, "utf8");
        if (!key || key.trim().length === 0) {
            throw new Error("empty signing key");
        }
        return key;
    }
    catch {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", {
            detail: "Unable to load WFSL signing key."
        });
    }
}
/**
 * Create and sign a receipt for a Pro execution.
 */
function issueReceipt(authority, params) {
    const receipt = {
        tool: params.tool,
        toolVersion: params.toolVersion,
        licenceSubject: authority.subject,
        plan: authority.plan,
        policy: authority.policy,
        outputHash: params.outputHash,
        issuedAt: new Date().toISOString()
    };
    const signer = (0, crypto_1.createSign)("sha256");
    signer.update(JSON.stringify(receipt));
    signer.end();
    const privateKey = loadSigningKey();
    const signature = signer.sign(privateKey, "base64");
    return { receipt, signature };
}

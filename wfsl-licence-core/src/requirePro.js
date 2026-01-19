"use strict";
// wfsl-licence-core/src/requirePro.ts
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
exports.requirePro = requirePro;
const errors_1 = require("./errors");
const verifyToken_1 = require("./verifyToken");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Load the WFSL public key used to verify entitlement signatures.
 * This must be a PUBLIC key only.
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
            detail: "Unable to load WFSL public key."
        });
    }
}
/**
 * Enforce that a valid Pro entitlement exists.
 * Returns verified authority on success.
 * Throws WfslError on failure.
 */
function requirePro(requiredFeature) {
    const token = (0, verifyToken_1.loadToken)();
    const publicKeyPem = loadPublicKey();
    const authority = (0, verifyToken_1.verifyToken)(token, publicKeyPem);
    if (authority.plan !== "pro") {
        throw (0, errors_1.wfslError)("WFSL_PLAN_INSUFFICIENT", {
            detail: `Plan '${authority.plan}' does not permit Pro operations.`
        });
    }
    if (requiredFeature) {
        if (!authority.features.includes(requiredFeature)) {
            throw (0, errors_1.wfslError)("WFSL_FEATURE_DISABLED", {
                detail: `Required feature '${requiredFeature}' not enabled.`
            });
        }
    }
    return authority;
}

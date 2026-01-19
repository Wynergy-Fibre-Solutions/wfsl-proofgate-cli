"use strict";
// wfsl-licence-core/src/errors.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.WFSL_ERRORS = exports.WfslError = void 0;
exports.wfslError = wfslError;
class WfslError extends Error {
    code;
    exitCode;
    meta;
    constructor(code, message, exitCode, meta) {
        super(message);
        this.name = "WfslError";
        this.code = code;
        this.exitCode = exitCode;
        this.meta = meta;
    }
}
exports.WfslError = WfslError;
exports.WFSL_ERRORS = {
    WFSL_LICENCE_MISSING: {
        exitCode: 10,
        message: "Licence authority is required for this operation."
    },
    WFSL_LICENCE_INVALID: {
        exitCode: 11,
        message: "Licence authority could not be verified."
    },
    WFSL_LICENCE_EXPIRED: {
        exitCode: 12,
        message: "Licence authority has expired."
    },
    WFSL_LICENCE_REVOKED: {
        exitCode: 13,
        message: "Licence authority has been revoked."
    },
    WFSL_PLAN_INSUFFICIENT: {
        exitCode: 14,
        message: "Your current plan does not permit this operation."
    },
    WFSL_FEATURE_DISABLED: {
        exitCode: 15,
        message: "This feature is not enabled for your entitlement."
    },
    WFSL_POLICY_MISMATCH: {
        exitCode: 16,
        message: "The active policy does not permit this operation."
    },
    WFSL_BUILD_UNTRUSTED: {
        exitCode: 17,
        message: "This build cannot be verified as an official WFSL release."
    },
    WFSL_TAMPER_DETECTED: {
        exitCode: 18,
        message: "Integrity verification failed for this execution."
    },
    WFSL_IO_ERROR: {
        exitCode: 19,
        message: "A required file operation failed."
    },
    WFSL_CONFIG_ERROR: {
        exitCode: 20,
        message: "Configuration is invalid or incomplete."
    },
    WFSL_INTERNAL_ERROR: {
        exitCode: 99,
        message: "An internal error occurred."
    }
};
function wfslError(code, meta) {
    const def = exports.WFSL_ERRORS[code];
    return new WfslError(code, def.message, def.exitCode, meta);
}
//# sourceMappingURL=errors.js.map
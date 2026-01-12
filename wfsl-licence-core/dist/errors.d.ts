export type WfslErrorCode = "WFSL_LICENCE_MISSING" | "WFSL_LICENCE_INVALID" | "WFSL_LICENCE_EXPIRED" | "WFSL_LICENCE_REVOKED" | "WFSL_PLAN_INSUFFICIENT" | "WFSL_FEATURE_DISABLED" | "WFSL_POLICY_MISMATCH" | "WFSL_BUILD_UNTRUSTED" | "WFSL_TAMPER_DETECTED" | "WFSL_IO_ERROR" | "WFSL_CONFIG_ERROR" | "WFSL_INTERNAL_ERROR";
export type WfslExitCode = 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 99;
export interface WfslErrorMeta {
    readonly detail?: string;
    readonly hint?: string;
    readonly docsRef?: string;
    readonly correlationId?: string;
    readonly safeContext?: Record<string, string | number | boolean | null>;
}
export declare class WfslError extends Error {
    readonly code: WfslErrorCode;
    readonly exitCode: WfslExitCode;
    readonly meta?: WfslErrorMeta;
    constructor(code: WfslErrorCode, message: string, exitCode: WfslExitCode, meta?: WfslErrorMeta);
}
export declare const WFSL_ERRORS: Record<WfslErrorCode, {
    readonly exitCode: WfslExitCode;
    readonly message: string;
    readonly hint?: string;
}>;
export declare function wfslError(code: WfslErrorCode, meta?: WfslErrorMeta): WfslError;
//# sourceMappingURL=errors.d.ts.map
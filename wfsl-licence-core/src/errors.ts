// wfsl-licence-core/src/errors.ts

export type WfslErrorCode =
  | "WFSL_LICENCE_MISSING"
  | "WFSL_LICENCE_INVALID"
  | "WFSL_LICENCE_EXPIRED"
  | "WFSL_LICENCE_REVOKED"
  | "WFSL_PLAN_INSUFFICIENT"
  | "WFSL_FEATURE_DISABLED"
  | "WFSL_POLICY_MISMATCH"
  | "WFSL_BUILD_UNTRUSTED"
  | "WFSL_TAMPER_DETECTED"
  | "WFSL_IO_ERROR"
  | "WFSL_CONFIG_ERROR"
  | "WFSL_INTERNAL_ERROR";

export type WfslExitCode =
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 99;

export interface WfslErrorMeta {
  readonly detail?: string;
  readonly hint?: string;
  readonly docsRef?: string;
  readonly correlationId?: string;
  readonly safeContext?: Record<string, string | number | boolean | null>;
}

export class WfslError extends Error {
  public readonly code: WfslErrorCode;
  public readonly exitCode: WfslExitCode;
  public readonly meta?: WfslErrorMeta;

  constructor(
    code: WfslErrorCode,
    message: string,
    exitCode: WfslExitCode,
    meta?: WfslErrorMeta
  ) {
    super(message);
    this.name = "WfslError";
    this.code = code;
    this.exitCode = exitCode;
    this.meta = meta;
  }
}

export const WFSL_ERRORS: Record<
  WfslErrorCode,
  { readonly exitCode: WfslExitCode; readonly message: string; readonly hint?: string }
> = {
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

export function wfslError(code: WfslErrorCode, meta?: WfslErrorMeta): WfslError {
  const def = WFSL_ERRORS[code];
  return new WfslError(code, def.message, def.exitCode, meta);
}

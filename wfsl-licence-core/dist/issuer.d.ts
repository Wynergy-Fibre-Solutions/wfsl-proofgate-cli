import { WfslEntitlement } from "./verifyToken";
export interface IssueTokenParams {
    readonly subject: string;
    readonly plan: "community" | "pro" | string;
    readonly features?: readonly string[];
    readonly policy?: string;
    readonly expiresAtEpochSeconds: number;
    readonly issuer?: string;
}
export interface IssuedToken {
    readonly token: string;
    readonly payload: WfslEntitlement;
    readonly signatureBase64: string;
}
export interface IssuanceLogEntry {
    readonly ts: string;
    readonly jti: string;
    readonly sub: string;
    readonly plan: string;
    readonly exp: number;
    readonly featuresCount: number;
    readonly policy?: string;
    readonly payloadHash: string;
    readonly tokenHash: string;
    readonly prev?: string;
    readonly entryHash: string;
}
/**
 * Load WFSL private signing key (Ed25519).
 * NEVER commit private keys.
 */
export declare function loadSigningKeyPem(): string;
/**
 * Create an entitlement payload (strict v1).
 */
export declare function buildEntitlement(params: IssueTokenParams): WfslEntitlement;
/**
 * Sign payload with Ed25519 and return token parts.
 * Token format: base64(payload).base64(signature)
 */
export declare function issueToken(payload: WfslEntitlement, privateKeyPem: string): IssuedToken;
/**
 * Append-only issuance log with a simple hash chain.
 * This is not secret, but it is tamper-evident.
 */
export declare function appendIssuanceLog(params: {
    readonly logPath: string;
    readonly payload: WfslEntitlement;
    readonly token: string;
}): IssuanceLogEntry;
//# sourceMappingURL=issuer.d.ts.map
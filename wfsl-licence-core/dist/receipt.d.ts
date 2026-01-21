import { VerifiedAuthority } from "./verifyToken";
/**
 * Receipt payload issued for Pro executions.
 * This is what makes outputs authoritative.
 */
export interface WfslReceipt {
    readonly tool: string;
    readonly toolVersion: string;
    readonly licenceSubject: string;
    readonly plan: string;
    readonly policy?: string;
    readonly outputHash: string;
    readonly issuedAt: string;
}
/**
 * Create and sign a receipt for a Pro execution.
 */
export declare function issueReceipt(authority: VerifiedAuthority, params: {
    tool: string;
    toolVersion: string;
    outputHash: string;
}): {
    receipt: WfslReceipt;
    signature: string;
};
//# sourceMappingURL=receipt.d.ts.map
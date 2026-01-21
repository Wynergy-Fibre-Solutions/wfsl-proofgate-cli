import { WfslReceipt } from "./receipt";
/**
 * Verify a signed receipt and return the receipt on success.
 * Throws WfslError on any verification failure.
 */
export declare function verifyReceipt(receipt: WfslReceipt, signatureBase64: string): WfslReceipt;
//# sourceMappingURL=verifyReceipt.d.ts.map
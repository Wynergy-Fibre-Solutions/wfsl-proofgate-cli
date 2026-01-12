export interface WfslEntitlement {
    readonly iss: string;
    readonly sub: string;
    readonly plan: "community" | "pro" | string;
    readonly features?: readonly string[];
    readonly policy?: string;
    readonly exp: number;
    readonly jti?: string;
    readonly version: "v1";
}
export interface VerifiedAuthority {
    readonly subject: string;
    readonly plan: string;
    readonly features: readonly string[];
    readonly policy?: string;
    readonly expiresAt: number;
    readonly tokenId?: string;
}
export declare function loadToken(): string;
export declare function verifyToken(token: string, publicKeyPem?: string): VerifiedAuthority;
//# sourceMappingURL=verifyToken.d.ts.map
import fs from "node:fs";
import path from "node:path";
import nacl from "tweetnacl";
import { ExitCode, fail } from "../lib/exit-codes.js";
function readFileStrict(p, label) {
    try {
        return fs.readFileSync(p);
    }
    catch {
        fail(ExitCode.NotFound, `NOT_FOUND: ${label} not found at ${p}`);
    }
}
function parseJsonStrict(buf, label) {
    try {
        return JSON.parse(buf.toString("utf8"));
    }
    catch {
        fail(ExitCode.ParseError, `PARSE_ERROR: ${label} is not valid JSON`);
    }
}
function cleanBase64FromFile(filePath, label) {
    const raw = readFileStrict(filePath, label);
    // Read as bytes then coerce to ascii and strip anything not base64 alphabet.
    return raw
        .toString("ascii")
        .replace(/[^A-Za-z0-9+/=]/g, "");
}
function b64ToU8(b64, label) {
    try {
        const raw = Buffer.from(b64, "base64");
        return new Uint8Array(raw);
    }
    catch {
        fail(ExitCode.InvalidInput, `INVALID_INPUT: ${label} is not valid base64`);
    }
}
function normalisePath(p, baseDir) {
    return path.isAbsolute(p) ? p : path.resolve(baseDir, p);
}
/**
 * Manifest schema (supported):
 * {
 *   "messageFile": "./message.txt",
 *   "signatureB64": "base64 detached signature",          // optional if signatureFile provided
 *   "signatureFile": "./signature.b64",                   // optional if signatureB64 provided
 *   "publicKeyB64": "base64 public key (32 bytes)",       // optional if --public-key provided
 *   "publicKeyFile": "./public.key.b64"                   // optional if --public-key provided
 * }
 *
 * CLI also supports:
 *   --public-key <path>  (overrides manifest publicKeyB64/publicKeyFile)
 */
function fallbackVerify(manifestPath, publicKeyPathArg) {
    const baseDir = path.dirname(manifestPath);
    const manifest = parseJsonStrict(readFileStrict(manifestPath, "manifest"), "manifest");
    const messageFile = String(manifest.messageFile ?? "");
    if (!messageFile)
        return { ok: false, reason: "manifest missing required field: messageFile" };
    const msg = readFileStrict(normalisePath(messageFile, baseDir), "messageFile");
    // Signature: prefer signatureFile if present, else signatureB64
    let signatureB64 = "";
    if (typeof manifest.signatureFile === "string" && manifest.signatureFile.length > 0) {
        const sigPath = normalisePath(manifest.signatureFile, baseDir);
        signatureB64 = cleanBase64FromFile(sigPath, "signatureFile");
    }
    else if (typeof manifest.signatureB64 === "string" && manifest.signatureB64.length > 0) {
        signatureB64 = String(manifest.signatureB64);
    }
    if (!signatureB64)
        return { ok: false, reason: "no signature provided (signatureFile or signatureB64)" };
    const sig = b64ToU8(signatureB64, "signature");
    if (sig.length !== 64) {
        return { ok: false, reason: `signature must be 64 bytes (Ed25519 detached). Got ${sig.length} bytes.` };
    }
    // Public key: CLI arg overrides manifest
    let pkB64 = "";
    if (publicKeyPathArg) {
        pkB64 = cleanBase64FromFile(normalisePath(publicKeyPathArg, process.cwd()), "public key");
    }
    else if (typeof manifest.publicKeyFile === "string" && manifest.publicKeyFile.length > 0) {
        pkB64 = cleanBase64FromFile(normalisePath(manifest.publicKeyFile, baseDir), "publicKeyFile");
    }
    else if (typeof manifest.publicKeyB64 === "string" && manifest.publicKeyB64.length > 0) {
        pkB64 = String(manifest.publicKeyB64);
    }
    if (!pkB64)
        return { ok: false, reason: "no public key provided (--public-key, publicKeyFile, or publicKeyB64)" };
    const pk = b64ToU8(pkB64, "public key");
    if (pk.length !== 32) {
        return { ok: false, reason: `public key must be 32 bytes (Ed25519). Got ${pk.length} bytes.` };
    }
    const ok = nacl.sign.detached.verify(new Uint8Array(msg), sig, pk);
    if (!ok)
        return { ok: false, reason: "signature verification failed" };
    return { ok: true, reason: "verified" };
}
function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--manifest")
            out.manifestPath = argv[++i];
        else if (a === "--public-key")
            out.publicKeyPath = argv[++i];
        else if (a === "--verifier")
            out.verifierPath = argv[++i]; // kept for forward compatibility
        else if (a === "--help" || a === "-h")
            out.help = true;
        else {
            out.unknown ??= [];
            out.unknown.push(a);
        }
    }
    return out;
}
export async function runVerify(argv) {
    const args = parseArgs(argv);
    if (args.help) {
        process.stdout.write([
            "WFSL ProofGate — verify",
            "",
            "Usage:",
            "  wfsl-proofgate verify --manifest <path> [--public-key <path>]",
            "",
            "Manifest fields:",
            "  messageFile    (required)",
            "  signatureFile  (recommended) OR signatureB64",
            "  publicKeyFile  OR publicKeyB64 (unless --public-key provided)",
            "",
            "Exit codes:",
            "  0  OK",
            "  10 USAGE",
            "  20 VERIFY_FAILED",
            "  30 INTERNAL_ERROR",
            "  40 NOT_FOUND",
            "  41 INVALID_INPUT",
            "  42 PARSE_ERROR",
            ""
        ].join("\n"));
        process.exit(ExitCode.Ok);
    }
    if (Array.isArray(args.unknown) && args.unknown.length > 0) {
        fail(ExitCode.Usage, `USAGE: unknown args: ${args.unknown.join(" ")}`);
    }
    if (!args.manifestPath) {
        fail(ExitCode.Usage, "USAGE: --manifest <path> is required");
    }
    const manifestPath = path.resolve(process.cwd(), args.manifestPath);
    if (!fs.existsSync(manifestPath)) {
        fail(ExitCode.NotFound, `NOT_FOUND: manifest not found at ${manifestPath}`);
    }
    const result = fallbackVerify(manifestPath, args.publicKeyPath);
    if (result.ok) {
        process.stdout.write("OK: verified\n");
        process.exit(ExitCode.Ok);
    }
    process.stderr.write(`VERIFY_FAILED: ${result.reason}\n`);
    process.exit(ExitCode.VerifyFailed);
}
//# sourceMappingURL=verify.js.map
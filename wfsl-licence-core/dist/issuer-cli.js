"use strict";
// wfsl-licence-core/src/issuer-cli.ts
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const errors_1 = require("./errors");
const issuer_1 = require("./issuer");
const verifyToken_1 = require("./verifyToken");
function readArg(flag) {
    const i = process.argv.indexOf(flag);
    if (i === -1)
        return undefined;
    const v = process.argv[i + 1];
    if (!v || v.startsWith("--"))
        return undefined;
    return v;
}
function hasFlag(flag) {
    return process.argv.includes(flag);
}
function parseFeatures(v) {
    if (!v)
        return [];
    return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}
function loadPublicKeyFromEnv() {
    const keyPath = process.env.WFSL_PUBLIC_KEY_PATH;
    if (!keyPath) {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", {
            detail: "WFSL_PUBLIC_KEY_PATH is required for verification.",
            hint: "Set WFSL_PUBLIC_KEY_PATH to a public key PEM path."
        });
    }
    try {
        const pem = fs.readFileSync(keyPath, "utf8");
        if (!pem || pem.trim().length === 0)
            throw new Error("empty key");
        return pem;
    }
    catch {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", {
            detail: "Unable to load WFSL public verification key.",
            hint: "Confirm WFSL_PUBLIC_KEY_PATH points to a readable PEM file."
        });
    }
}
function printHelp() {
    const text = `
wfsl-licence-core issuer CLI (Ed25519)

Commands:

  issue
    --sub <subject>                 required
    --plan <plan>                   required (e.g. pro)
    --exp-hours <hours>             required (e.g. 24)
    --features <csv>                optional (e.g. evidence.pro,receipt.verify)
    --policy <policy>               optional
    --iss <issuer>                  optional (default wfsl)
    --out <path>                    optional (writes token to file)
    --log <path>                    optional (default .wfsl/issuance.log.jsonl)

  verify
    --token <token>                 required (or --token-file <path>)
    (requires WFSL_PUBLIC_KEY_PATH)

Examples (PowerShell):

  $env:WFSL_SIGNING_KEY_PATH="C:\\secure\\wfsl_private_key.pem"
  node dist\\issuer-cli.js issue --sub "org_123" --plan pro --exp-hours 24 --features "evidence.pro" --out ".\\token.txt"

  $env:WFSL_PUBLIC_KEY_PATH="C:\\secure\\wfsl_public_key.pem"
  node dist\\issuer-cli.js verify --token-file ".\\token.txt"
`.trim();
    console.log(text);
}
function cmdIssue() {
    const sub = readArg("--sub");
    const plan = readArg("--plan");
    const expHoursRaw = readArg("--exp-hours");
    const featuresCsv = readArg("--features");
    const policy = readArg("--policy");
    const iss = readArg("--iss");
    const outPath = readArg("--out");
    const logPathArg = readArg("--log");
    if (!sub || !plan || !expHoursRaw) {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", {
            detail: "Missing required args for issue.",
            hint: "Required: --sub, --plan, --exp-hours. Run with --help."
        });
    }
    const expHours = Number(expHoursRaw);
    if (!Number.isFinite(expHours) || expHours <= 0) {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", {
            detail: "--exp-hours must be a positive number."
        });
    }
    const exp = Math.floor(Date.now() / 1000) + Math.floor(expHours * 3600);
    const payload = (0, issuer_1.buildEntitlement)({
        subject: sub,
        plan,
        features: parseFeatures(featuresCsv),
        policy,
        issuer: iss,
        expiresAtEpochSeconds: exp
    });
    const privPem = (0, issuer_1.loadSigningKeyPem)();
    const issued = (0, issuer_1.issueToken)(payload, privPem);
    const defaultLog = path.join(process.cwd(), ".wfsl", "issuance.log.jsonl");
    const logPath = logPathArg ? path.resolve(logPathArg) : defaultLog;
    const entry = (0, issuer_1.appendIssuanceLog)({
        logPath,
        payload: issued.payload,
        token: issued.token
    });
    if (outPath) {
        fs.writeFileSync(path.resolve(outPath), issued.token, "utf8");
    }
    // stdout stays machine-friendly
    console.log(JSON.stringify({
        ok: true,
        tokenWritten: Boolean(outPath),
        outPath: outPath ? path.resolve(outPath) : undefined,
        logPath,
        jti: issued.payload.jti,
        sub: issued.payload.sub,
        plan: issued.payload.plan,
        exp: issued.payload.exp,
        entryHash: entry.entryHash
    }, null, 2));
}
function cmdVerify() {
    const token = readArg("--token");
    const tokenFile = readArg("--token-file");
    let t = token?.trim();
    if (!t && tokenFile) {
        const p = path.resolve(tokenFile);
        try {
            t = fs.readFileSync(p, "utf8").trim();
        }
        catch {
            throw (0, errors_1.wfslError)("WFSL_IO_ERROR", { detail: "Unable to read --token-file." });
        }
    }
    if (!t) {
        throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", {
            detail: "Missing --token or --token-file.",
            hint: "Run with --help."
        });
    }
    const pubPem = loadPublicKeyFromEnv();
    const authority = (0, verifyToken_1.verifyToken)(t, pubPem);
    console.log(JSON.stringify({
        ok: true,
        subject: authority.subject,
        plan: authority.plan,
        features: authority.features,
        policy: authority.policy,
        expiresAt: authority.expiresAt,
        tokenId: authority.tokenId
    }, null, 2));
}
function main() {
    if (hasFlag("--help") || hasFlag("-h")) {
        printHelp();
        return;
    }
    const cmd = process.argv[2];
    if (!cmd) {
        printHelp();
        process.exit(2);
    }
    if (cmd === "issue") {
        cmdIssue();
        return;
    }
    if (cmd === "verify") {
        cmdVerify();
        return;
    }
    throw (0, errors_1.wfslError)("WFSL_CONFIG_ERROR", {
        detail: `Unknown command '${cmd}'.`,
        hint: "Use: issue | verify"
    });
}
try {
    main();
}
catch (err) {
    if (err instanceof errors_1.WfslError) {
        console.error(err.message);
        process.exit(err.exitCode);
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    process.exit(99);
}
//# sourceMappingURL=issuer-cli.js.map
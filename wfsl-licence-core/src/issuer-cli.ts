// wfsl-licence-core/src/issuer-cli.ts

import * as fs from "fs";
import * as path from "path";
import { wfslError, WfslError } from "./errors";
import { buildEntitlement, issueToken, loadSigningKeyPem, appendIssuanceLog } from "./issuer";
import { verifyToken } from "./verifyToken";

function readArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) return undefined;
  return v;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseFeatures(v?: string): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadPublicKeyFromEnv(): string {
  const keyPath = process.env.WFSL_PUBLIC_KEY_PATH;
  if (!keyPath) {
    throw wfslError("WFSL_CONFIG_ERROR", {
      detail: "WFSL_PUBLIC_KEY_PATH is required for verification.",
      hint: "Set WFSL_PUBLIC_KEY_PATH to a public key PEM path."
    });
  }

  try {
    const pem = fs.readFileSync(keyPath, "utf8");
    if (!pem || pem.trim().length === 0) throw new Error("empty key");
    return pem;
  } catch {
    throw wfslError("WFSL_CONFIG_ERROR", {
      detail: "Unable to load WFSL public verification key.",
      hint: "Confirm WFSL_PUBLIC_KEY_PATH points to a readable PEM file."
    });
  }
}

function printHelp(): void {
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

function cmdIssue(): void {
  const sub = readArg("--sub");
  const plan = readArg("--plan");
  const expHoursRaw = readArg("--exp-hours");
  const featuresCsv = readArg("--features");
  const policy = readArg("--policy");
  const iss = readArg("--iss");
  const outPath = readArg("--out");
  const logPathArg = readArg("--log");

  if (!sub || !plan || !expHoursRaw) {
    throw wfslError("WFSL_CONFIG_ERROR", {
      detail: "Missing required args for issue.",
      hint: "Required: --sub, --plan, --exp-hours. Run with --help."
    });
  }

  const expHours = Number(expHoursRaw);
  if (!Number.isFinite(expHours) || expHours <= 0) {
    throw wfslError("WFSL_CONFIG_ERROR", {
      detail: "--exp-hours must be a positive number."
    });
  }

  const exp = Math.floor(Date.now() / 1000) + Math.floor(expHours * 3600);
  const payload = buildEntitlement({
    subject: sub,
    plan,
    features: parseFeatures(featuresCsv),
    policy,
    issuer: iss,
    expiresAtEpochSeconds: exp
  });

  const privPem = loadSigningKeyPem();
  const issued = issueToken(payload, privPem);

  const defaultLog = path.join(process.cwd(), ".wfsl", "issuance.log.jsonl");
  const logPath = logPathArg ? path.resolve(logPathArg) : defaultLog;

  const entry = appendIssuanceLog({
    logPath,
    payload: issued.payload,
    token: issued.token
  });

  if (outPath) {
    fs.writeFileSync(path.resolve(outPath), issued.token, "utf8");
  }

  // stdout stays machine-friendly
  console.log(
    JSON.stringify(
      {
        ok: true,
        tokenWritten: Boolean(outPath),
        outPath: outPath ? path.resolve(outPath) : undefined,
        logPath,
        jti: issued.payload.jti,
        sub: issued.payload.sub,
        plan: issued.payload.plan,
        exp: issued.payload.exp,
        entryHash: entry.entryHash
      },
      null,
      2
    )
  );
}

function cmdVerify(): void {
  const token = readArg("--token");
  const tokenFile = readArg("--token-file");

  let t: string | undefined = token?.trim();

  if (!t && tokenFile) {
    const p = path.resolve(tokenFile);
    try {
      t = fs.readFileSync(p, "utf8").trim();
    } catch {
      throw wfslError("WFSL_IO_ERROR", { detail: "Unable to read --token-file." });
    }
  }

  if (!t) {
    throw wfslError("WFSL_CONFIG_ERROR", {
      detail: "Missing --token or --token-file.",
      hint: "Run with --help."
    });
  }

  const pubPem = loadPublicKeyFromEnv();
  const authority = verifyToken(t, pubPem);

  console.log(
    JSON.stringify(
      {
        ok: true,
        subject: authority.subject,
        plan: authority.plan,
        features: authority.features,
        policy: authority.policy,
        expiresAt: authority.expiresAt,
        tokenId: authority.tokenId
      },
      null,
      2
    )
  );
}

function main(): void {
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

  throw wfslError("WFSL_CONFIG_ERROR", {
    detail: `Unknown command '${cmd}'.`,
    hint: "Use: issue | verify"
  });
}

try {
  main();
} catch (err: unknown) {
  if (err instanceof WfslError) {
    console.error(err.message);
    process.exit(err.exitCode);
  }

  const msg = err instanceof Error ? err.message : String(err);
  console.error(msg);
  process.exit(99);
}

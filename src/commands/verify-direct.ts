import fs from "node:fs";
import nacl from "tweetnacl";
import { ExitCode } from "../lib/exit-codes.js";

function fail(code: ExitCode, message: string): never {
  process.stderr.write(`VERIFY_FAILED: ${message}\n`);
  process.exit(code);
}

export function runVerifyDirect(args: string[]): void {
  let messagePath = "";
  let signaturePath = "";
  let publicKeyPath = "";

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--message") messagePath = args[++i];
    else if (a === "--signature") signaturePath = args[++i];
    else if (a === "--public-key") publicKeyPath = args[++i];
  }

  if (!messagePath || !signaturePath || !publicKeyPath) {
    fail(
      ExitCode.Usage,
      "usage: verify-direct --message <file> --signature <file> --public-key <file>"
    );
  }

  const message = fs.readFileSync(messagePath);
  const signature = Buffer.from(
    fs.readFileSync(signaturePath, "ascii").replace(/[^A-Za-z0-9+/=]/g, ""),
    "base64"
  );
  const publicKey = Buffer.from(
    fs.readFileSync(publicKeyPath, "ascii").replace(/[^A-Za-z0-9+/=]/g, ""),
    "base64"
  );

  if (signature.length !== 64) {
    fail(ExitCode.VerifyFailed, `signature must be 64 bytes, got ${signature.length}`);
  }

  if (publicKey.length !== 32) {
    fail(ExitCode.VerifyFailed, `public key must be 32 bytes, got ${publicKey.length}`);
  }

  const ok = nacl.sign.detached.verify(
    new Uint8Array(message),
    new Uint8Array(signature),
    new Uint8Array(publicKey)
  );

  if (!ok) {
    fail(ExitCode.VerifyFailed, "signature verification failed");
  }

  process.stdout.write("OK: verified\n");
  process.exit(ExitCode.Ok);
}

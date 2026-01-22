import fs from "node:fs";
import path from "node:path";
import { ExitCode, fail } from "../lib/exit-codes.js";
import { runRepoGuard } from "../lib/repo-guard.js";

function parseArgs(argv: string[]) {
  const out: any = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--manifest") out.manifestPath = argv[++i];
    else if (a === "--strict") out.strict = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else {
      out.unknown ??= [];
      out.unknown.push(a);
    }
  }
  return out;
}

export async function runStatus(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  if (args.help) {
    process.stdout.write(
      [
        "WFSL ProofGate — status",
        "",
        "Usage:",
        "  wfsl-proofgate status --manifest <path> [--json] [--strict]",
        "",
        "Notes:",
        "  Default exits 0 and prints verdict.",
        "  --strict exits non-zero when repoState is INVALID.",
        ""
      ].join("\n")
    );
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

  const verdict = runRepoGuard(manifestPath);

  if (args.json) {
    process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
  } else {
    process.stdout.write(
      [
        `repoState: ${verdict.repoState}`,
        `lockfile: ${verdict.lockfile}`,
        `gitignore: ${verdict.gitignore}`,
        `buildOutput: ${verdict.buildOutput}`,
        verdict.violations.length ? "violations:" : "violations: none",
        ...verdict.violations.map((v: string) => `- ${v}`)
      ].join("\n") + "\n"
    );
  }

  if (args.strict && verdict.repoState === "INVALID") {
    process.exit(ExitCode.VerifyFailed);
  }

  process.exit(ExitCode.Ok);
}

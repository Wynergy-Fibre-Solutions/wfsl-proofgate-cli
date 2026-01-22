import { ExitCode, fail } from "./lib/exit-codes.js";
import { runVerify } from "./commands/verify.js";
import { runStatus } from "./commands/status.js";

function usage(): string {
  return [
    "WFSL ProofGate CLI",
    "",
    "Usage:",
    "  wfsl-proofgate <command> [args]",
    "",
    "Commands:",
    "  verify   Verify a manifest (Repo Guard enforced when configured)",
    "  status   Print Repo Guard verdict (use --strict to fail when invalid)",
    "",
    "Help:",
    "  wfsl-proofgate verify --help",
    "  wfsl-proofgate status --help",
    ""
  ].join("\n");
}

export async function main(argv: string[]): Promise<void> {
  const args = argv.slice(2);
  const cmd = (args[0] ?? "").trim();

  if (!cmd || cmd === "--help" || cmd === "-h") {
    process.stdout.write(usage() + "\n");
    process.exit(ExitCode.Ok);
  }

  const rest = args.slice(1);

  if (cmd === "verify") {
    await runVerify(rest);
    return;
  }

  if (cmd === "status") {
    await runStatus(rest);
    return;
  }

  fail(ExitCode.Usage, `USAGE: unknown command '${cmd}'\n\n${usage()}`);
}

void main(process.argv);

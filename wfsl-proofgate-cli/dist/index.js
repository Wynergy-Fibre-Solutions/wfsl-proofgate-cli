import { ExitCode, fail } from "./lib/exit-codes.js";
import { runVerify } from "./commands/verify.js";
async function main() {
    const argv = process.argv.slice(2);
    const cmd = argv[0];
    if (!cmd || cmd === "--help" || cmd === "-h") {
        process.stdout.write([
            "WFSL ProofGate CLI (skeleton)",
            "",
            "Commands:",
            "  verify   Verify a proof manifest using existing verifier (preferred) or fallback Ed25519 verify",
            "",
            "Usage:",
            "  wfsl-proofgate verify --manifest <path> [--public-key <path>] [--verifier <path>]",
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
    if (cmd === "verify") {
        await runVerify(argv.slice(1));
        return;
    }
    fail(ExitCode.Usage, `USAGE: unknown command: ${cmd}`);
}
main().catch((e) => {
    process.stderr.write(`INTERNAL_ERROR: ${String(e?.message ?? e)}\n`);
    process.exit(ExitCode.InternalError);
});
//# sourceMappingURL=index.js.map
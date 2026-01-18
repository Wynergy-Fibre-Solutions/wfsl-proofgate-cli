export const ExitCode = {
    Ok: 0,
    Usage: 10,
    NotFound: 40,
    InvalidInput: 41,
    ParseError: 42,
    VerifyFailed: 20,
    InternalError: 30
};
export function fail(code, message) {
    process.stderr.write(`${message}\n`);
    process.exit(code);
}
//# sourceMappingURL=exit-codes.js.map
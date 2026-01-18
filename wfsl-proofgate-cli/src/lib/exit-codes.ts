export const ExitCode = {
  Ok: 0,

  Usage: 10,

  NotFound: 40,
  InvalidInput: 41,
  ParseError: 42,

  VerifyFailed: 20,

  InternalError: 30
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

export function fail(code: ExitCode, message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

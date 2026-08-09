import type { ErrorCode } from "./error-code";

export class AppError extends Error {
  statusCode: number;
  code: ErrorCode;
  details?: Record<string, string[]>;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

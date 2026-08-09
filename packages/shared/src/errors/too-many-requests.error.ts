import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(429, ErrorCodes.TOO_MANY_REQUESTS, message);
  }
}

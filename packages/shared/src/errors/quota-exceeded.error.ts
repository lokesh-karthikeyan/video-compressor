import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class QuotaExceededError extends AppError {
  constructor(message = "Quota exceeded") {
    super(403, ErrorCodes.QUOTA_EXCEEDED, message);
  }
}

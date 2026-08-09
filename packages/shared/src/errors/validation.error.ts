import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>) {
    super(400, ErrorCodes.VALIDATION_ERROR, "Validation failed", details);
  }
}

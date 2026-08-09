import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, ErrorCodes.FORBIDDEN, message);
  }
}

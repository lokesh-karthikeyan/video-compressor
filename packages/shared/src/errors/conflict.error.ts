import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(409, ErrorCodes.CONFLICT, message);
  }
}

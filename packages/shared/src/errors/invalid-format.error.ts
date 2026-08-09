import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class InvalidFormatError extends AppError {
  constructor(message = "Invalid format") {
    super(400, ErrorCodes.INVALID_FORMAT, message);
  }
}

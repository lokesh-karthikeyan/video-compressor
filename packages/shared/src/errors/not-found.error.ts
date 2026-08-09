import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, ErrorCodes.NOT_FOUND, message);
  }
}

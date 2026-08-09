import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class InternalServerError extends AppError {
  constructor() {
    super(500, ErrorCodes.INTERNAL_ERROR, "Internal server error");
  }
}

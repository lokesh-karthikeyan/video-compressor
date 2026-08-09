import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class ProcessingError extends AppError {
  constructor(message = "Processing failed") {
    super(500, ErrorCodes.PROCESSING_ERROR, message);
  }
}

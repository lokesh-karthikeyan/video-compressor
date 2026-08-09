import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class FileTooLargeError extends AppError {
  constructor(message = "File too large") {
    super(413, ErrorCodes.FILE_TOO_LARGE, message);
  }
}

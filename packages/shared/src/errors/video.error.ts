import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class VideoNotFoundError extends AppError {
  constructor() {
    super(404, ErrorCodes.VIDEO_NOT_FOUND, "Video not found");
  }
}

export class VideoNotReadyError extends AppError {
  constructor(message = "Video is still processing") {
    super(409, ErrorCodes.VIDEO_NOT_READY, message);
  }
}

export class StorageError extends AppError {
  constructor(message = "Storage error") {
    super(500, ErrorCodes.STORAGE_ERROR, message);
  }
}

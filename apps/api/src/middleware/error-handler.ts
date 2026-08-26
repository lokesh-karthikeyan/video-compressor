import {
  AppError,
  ErrorCodes,
  type ErrorResponse,
} from "@video-compressor/shared";
import { NotFoundError as ElysiaNotFoundError, ValidationError as ElysiaValidationError } from "elysia";

export const errorHandler = ({ error }: { error: unknown }): ErrorResponse => {
  if (error instanceof AppError) {
    const { statusCode, code, message, details } = error;

    return {
      statusCode,
      code,
      message,
      details,
    };
  }

  if (error instanceof ElysiaValidationError) {
    return {
      statusCode: 422,
      code: ErrorCodes.VALIDATION_ERROR,
      message: error.message,
    };
  }

  if (error instanceof ElysiaNotFoundError) {
    return {
      statusCode: 404,
      code: ErrorCodes.NOT_FOUND,
      message: error.message,
    };
  }

  console.error("Unhandled error", error);

  return {
    statusCode: 500,
    code: ErrorCodes.INTERNAL_ERROR,
    message: "Internal server error",
  };
};

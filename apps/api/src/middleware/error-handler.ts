import {
  AppError,
  ErrorCodes,
  type ErrorResponse,
} from "@video-compressor/shared";

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

  console.error("Unhandled error", error);

  return {
    statusCode: 500,
    code: ErrorCodes.INTERNAL_ERROR,
    message: "Internal server error",
  };
};

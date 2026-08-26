import { describe, it, expect } from "bun:test";
import { AppError } from "../../../packages/shared/src/errors/app.error";
import { ErrorCodes } from "../../../packages/shared/src/errors/error-code";
import {
  AuthInvalidCredentialsError,
  AuthUserExistsError,
  AuthTokenExpiredError,
  AuthTokenInvalidError,
  AuthUnauthorizedError,
} from "../../../packages/shared/src/errors/auth.error";
import { ValidationError } from "../../../packages/shared/src/errors/validation.error";
import { NotFoundError } from "../../../packages/shared/src/errors/not-found.error";
import { ConflictError } from "../../../packages/shared/src/errors/conflict.error";
import { ForbiddenError } from "../../../packages/shared/src/errors/forbidden.error";
import { TooManyRequestsError } from "../../../packages/shared/src/errors/too-many-requests.error";
import { FileTooLargeError } from "../../../packages/shared/src/errors/file-too-large.error";
import { InvalidFormatError } from "../../../packages/shared/src/errors/invalid-format.error";
import { ProcessingError } from "../../../packages/shared/src/errors/processing.error";
import { QuotaExceededError } from "../../../packages/shared/src/errors/quota-exceeded.error";
import { InternalServerError } from "../../../packages/shared/src/errors/internal-server.error";
import { VideoNotFoundError, VideoNotReadyError, StorageError } from "../../../packages/shared/src/errors/video.error";

describe("AppError", () => {
  it("stores statusCode, code, message, and details", () => {
    const err = new AppError(422, ErrorCodes.VALIDATION_ERROR, "Bad input", {
      name: ["required"],
    });
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(err.message).toBe("Bad input");
    expect(err.details).toEqual({ name: ["required"] });
    expect(err).toBeInstanceOf(Error);
  });

  it("works without details", () => {
    const err = new AppError(500, ErrorCodes.INTERNAL_ERROR, "Oops");
    expect(err.details).toBeUndefined();
  });
});

describe("Auth errors", () => {
  it("AuthInvalidCredentialsError", () => {
    const err = new AuthInvalidCredentialsError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS);
    expect(err.message).toBe("Invalid email or password");
  });

  it("AuthUserExistsError", () => {
    const err = new AuthUserExistsError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCodes.AUTH_USER_EXISTS);
  });

  it("AuthTokenExpiredError", () => {
    const err = new AuthTokenExpiredError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(ErrorCodes.AUTH_TOKEN_EXPIRED);
  });

  it("AuthTokenInvalidError", () => {
    const err = new AuthTokenInvalidError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(ErrorCodes.AUTH_TOKEN_INVALID);
  });

  it("AuthUnauthorizedError", () => {
    const err = new AuthUnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED);
  });
});

describe("General errors", () => {
  it("ValidationError", () => {
    const err = new ValidationError({ email: ["required"] });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe(ErrorCodes.VALIDATION_ERROR);
  });

  it("NotFoundError", () => {
    const err = new NotFoundError("Not here");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(ErrorCodes.NOT_FOUND);
  });

  it("ConflictError", () => {
    const err = new ConflictError("Conflict");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCodes.CONFLICT);
  });

  it("ForbiddenError", () => {
    const err = new ForbiddenError("Forbidden");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe(ErrorCodes.FORBIDDEN);
  });

  it("TooManyRequestsError", () => {
    const err = new TooManyRequestsError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe(ErrorCodes.TOO_MANY_REQUESTS);
  });

  it("FileTooLargeError", () => {
    const err = new FileTooLargeError();
    expect(err.statusCode).toBe(413);
    expect(err.code).toBe(ErrorCodes.FILE_TOO_LARGE);
  });

  it("InvalidFormatError", () => {
    const err = new InvalidFormatError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe(ErrorCodes.INVALID_FORMAT);
  });

  it("ProcessingError", () => {
    const err = new ProcessingError("Failed");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe(ErrorCodes.PROCESSING_ERROR);
  });

  it("QuotaExceededError", () => {
    const err = new QuotaExceededError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe(ErrorCodes.QUOTA_EXCEEDED);
  });

  it("InternalServerError", () => {
    const err = new InternalServerError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe(ErrorCodes.INTERNAL_ERROR);
  });

  it("VideoNotFoundError", () => {
    const err = new VideoNotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(ErrorCodes.VIDEO_NOT_FOUND);
  });

  it("VideoNotReadyError", () => {
    const err = new VideoNotReadyError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe(ErrorCodes.VIDEO_NOT_READY);
  });

  it("StorageError", () => {
    const err = new StorageError("S3 down");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe(ErrorCodes.STORAGE_ERROR);
  });
});

describe("ErrorCodes", () => {
  it("has all expected codes", () => {
    const codes = Object.values(ErrorCodes);
    expect(codes.length).toBeGreaterThanOrEqual(18);
    expect(codes).toContain("AUTH_INVALID_CREDENTIALS");
    expect(codes).toContain("VIDEO_NOT_FOUND");
    expect(codes).toContain("INTERNAL_ERROR");
  });
});

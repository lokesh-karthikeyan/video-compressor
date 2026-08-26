import { describe, it, expect } from "bun:test";
import { errorHandler } from "../../../apps/api/src/middleware/error-handler";
import { AppError, ErrorCodes } from "@video-compressor/shared";

describe("errorHandler", () => {
  it("passes through AppError with statusCode, code, message, details", () => {
    const error = new AppError(422, ErrorCodes.VALIDATION_ERROR, "Bad input", {
      name: ["required"],
    });
    const result = errorHandler({ error });

    expect(result.statusCode).toBe(422);
    expect(result.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(result.message).toBe("Bad input");
    expect(result.details).toEqual({ name: ["required"] });
  });

  it("returns 500 for unknown errors", () => {
    const result = errorHandler({ error: new Error("something broke") });

    expect(result.statusCode).toBe(500);
    expect(result.code).toBe(ErrorCodes.INTERNAL_ERROR);
    expect(result.message).toBe("Internal server error");
  });

  it("returns 500 for null errors", () => {
    const result = errorHandler({ error: null });

    expect(result.statusCode).toBe(500);
    expect(result.code).toBe(ErrorCodes.INTERNAL_ERROR);
  });

  it("preserves AppError details as undefined when not set", () => {
    const error = new AppError(404, ErrorCodes.NOT_FOUND, "Gone");
    const result = errorHandler({ error });

    expect(result.details).toBeUndefined();
  });

  it("preserves all AppError properties", () => {
    const error = new AppError(409, ErrorCodes.CONFLICT, "Duplicate", {
      email: ["already exists"],
    });
    const result = errorHandler({ error });

    expect(result.statusCode).toBe(409);
    expect(result.code).toBe(ErrorCodes.CONFLICT);
    expect(result.message).toBe("Duplicate");
    expect(result.details).toEqual({ email: ["already exists"] });
  });

  it("returns 500 for string errors", () => {
    const result = errorHandler({ error: "string error" });

    expect(result.statusCode).toBe(500);
    expect(result.code).toBe(ErrorCodes.INTERNAL_ERROR);
  });
});

import { AppError } from "./app.error";
import { ErrorCodes } from "./error-code";

export class AuthInvalidCredentialsError extends AppError {
  constructor() {
    super(
      401,
      ErrorCodes.AUTH_INVALID_CREDENTIALS,
      "Invalid email or password",
    );
  }
}

export class AuthUserExistsError extends AppError {
  constructor() {
    super(409, ErrorCodes.AUTH_USER_EXISTS, "User already exists");
  }
}

export class AuthTokenExpiredError extends AppError {
  constructor() {
    super(401, ErrorCodes.AUTH_TOKEN_EXPIRED, "Token has expired");
  }
}

export class AuthTokenInvalidError extends AppError {
  constructor() {
    super(401, ErrorCodes.AUTH_TOKEN_INVALID, "Invalid token");
  }
}

export class AuthUnauthorizedError extends AppError {
  constructor() {
    super(401, ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized");
  }
}

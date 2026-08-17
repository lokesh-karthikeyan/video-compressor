import jwt from "@elysiajs/jwt";
import { getEnvOrThrowError } from "@video-compressor/shared";

export const jwtPlugin = jwt({
  secret: getEnvOrThrowError("JWT_SECRET"),
  exp: getEnvOrThrowError("JWT_EXPIRY"),
});

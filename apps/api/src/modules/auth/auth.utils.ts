import { AuthUnauthorizedError, type AuthUser } from "@video-compressor/shared";
import type { AuthResult, SignToken } from "./auth.types";

export const authUtils = {
  async validateAuthPayload(payload: unknown): Promise<AuthResult> {
    if (!payload || typeof payload !== "object")
      throw new AuthUnauthorizedError();

    const obj = payload as Record<string, unknown>;
    if (obj.type !== "access") throw new AuthUnauthorizedError();
    if (
      typeof obj.sub !== "string" ||
      typeof obj.email !== "string" ||
      typeof obj.name !== "string"
    ) {
      throw new AuthUnauthorizedError();
    }

    return { id: obj.sub, email: obj.email, name: obj.name };
  },

  async validateRefreshPayload(payload: unknown): Promise<{ id: string }> {
    if (!payload || typeof payload !== "object")
      throw new AuthUnauthorizedError();

    const obj = payload as Record<string, unknown>;
    if (obj.type !== "refresh") throw new AuthUnauthorizedError();
    if (typeof obj.sub !== "string") throw new AuthUnauthorizedError();

    return { id: obj.sub };
  },

  async generateTokens(user: AuthUser, signToken: SignToken) {
    const { id, email, name } = user;
    const accessToken = await signToken({
      sub: id,
      email,
      name,
      type: "access" as const,
    });

    const refreshToken = await signToken({
      sub: id,
      type: "refresh" as const,
    });

    return { accessToken, refreshToken };
  },
};

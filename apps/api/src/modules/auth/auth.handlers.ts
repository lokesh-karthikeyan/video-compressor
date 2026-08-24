import { authService } from "./auth.service";
import type { AuthHandlers } from "./auth.types";
import type { AuthResponse, MeResponse } from "@video-compressor/shared";
import { authUtils } from "./auth.utils";

export const authHandlers: AuthHandlers = {
  async register(body, signToken): Promise<AuthResponse> {
    const { user } = await authService.register(body);
    const { accessToken, refreshToken } = await authUtils.generateTokens(
      user,
      signToken,
    );

    return { user, accessToken, refreshToken };
  },

  async login(body, signToken): Promise<AuthResponse> {
    const { user } = await authService.login(body);
    const { accessToken, refreshToken } = await authUtils.generateTokens(
      user,
      signToken,
    );

    return { user, accessToken, refreshToken };
  },

  me(user): MeResponse {
    return { user };
  },

  async refresh(id, signToken): Promise<AuthResponse> {
    const { user } = await authService.findById(id);
    const { accessToken, refreshToken } = await authUtils.generateTokens(
      user,
      signToken,
    );
    return { user, accessToken, refreshToken };
  },
};

import type {
  AuthResponse,
  AuthUser,
  RegisterRequest,
  LoginRequest,
  MeResponse,
} from "@video-compressor/shared";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  name: string;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  type: "refresh";
};

export type AuthResult = {
  id: string;
  name: string;
  email: string;
};

export type SignToken = (
  payload: AccessTokenPayload | RefreshTokenPayload,
) => Promise<string>;

export type AuthHandlers = {
  register: (
    body: RegisterRequest,
    signToken: SignToken,
  ) => Promise<AuthResponse>;
  login: (body: LoginRequest, signToken: SignToken) => Promise<AuthResponse>;
  me: (user: AuthUser) => MeResponse;
  refresh: (id: string, signToken: SignToken) => Promise<AuthResponse>;
};

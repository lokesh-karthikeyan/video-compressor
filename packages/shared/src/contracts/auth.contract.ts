export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RefreshRequest = {
  refreshToken: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type MeResponse = {
  user: AuthUser;
};

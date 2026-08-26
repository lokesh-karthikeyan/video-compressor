import type { AuthUser, CompressOptions } from "@video-compressor/shared";

export type CompressionRecord = {
  date: string;
  count: number;
};

export type Preset = {
  id: string;
  name: string;
  description: string;
  crf: number;
  maxResolution: number;
  targetSizeBytes?: number;
};

export type CustomSettings = {
  crf: number;
  maxResolution: number;
};

export type ToastType = "info" | "warning" | "error";

export type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

export type { AuthUser, AuthResponse, Crop, CompressOptions } from "@video-compressor/shared";

export type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
};

export type CreateVideoData = {
  filename: string;
  fileSize: number;
  contentType: string;
  options: CompressOptions;
};

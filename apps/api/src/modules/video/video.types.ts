import type { CreateVideoRequest, CreateVideoResponse, Video } from "@video-compressor/shared";

export type VideoHandlers = {
  create: (userId: string, body: CreateVideoRequest) => Promise<CreateVideoResponse>;
  get: (userId: string, videoId: string) => Promise<Video>;
  confirmUpload: (userId: string, videoId: string) => Promise<void>;
};

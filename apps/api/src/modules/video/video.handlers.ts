import { videoService } from "./video.service";
import type { VideoHandlers } from "./video.types";

export const videoHandlers: VideoHandlers = {
  create: (userId, body) => videoService.create(userId, body),
  get: (userId, videoId) => videoService.get(userId, videoId),
  confirmUpload: (userId, videoId) => videoService.confirmUpload(userId, videoId),
};

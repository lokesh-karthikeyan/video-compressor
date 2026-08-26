import { videoQueries } from "@video-compressor/database";
import {
  ConflictError,
  ForbiddenError,
  VideoNotFoundError,
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  type CreateVideoRequest,
  type CreateVideoResponse,
  type Video,
  type VideoStatus,
} from "@video-compressor/shared";
import { InternalServerError } from "elysia";
import { publishVideoJob } from "../../plugins";

export const videoService = {
  async create(userId: string, body: CreateVideoRequest): Promise<CreateVideoResponse> {
    const { filename, fileSize, contentType, options } = body;

    const videoId = Bun.randomUUIDv7();
    const originalKey = `uploads/${userId}/${videoId}/${filename}`;

    const row = await videoQueries.create({
      id: videoId,
      userId,
      filename,
      originalKey,
      originalSize: fileSize,
      options: JSON.stringify(options),
      status: "pending_upload",
      progress: 0,
      createdAt: new Date(),
    });

    if (!row) throw new InternalServerError();

    const uploadUrl = await generatePresignedUploadUrl(originalKey, contentType);

    return {
      video: toVideo(row),
      uploadUrl,
      uploadKey: originalKey,
    };
  },

  async get(userId: string, videoId: string): Promise<Video> {
    const row = await videoQueries.findById(videoId);
    if (!row) throw new VideoNotFoundError();
    if (row.userId !== userId) throw new ForbiddenError();

    let downloadUrl: string | undefined;
    if (row.status === "completed" && row.outputKey) {
      downloadUrl = await generatePresignedDownloadUrl(row.outputKey);
    }

    return toVideo(row, downloadUrl);
  },

  async confirmUpload(userId: string, videoId: string): Promise<void> {
    const row = await videoQueries.findById(videoId);
    if (!row) throw new VideoNotFoundError();
    if (row.userId !== userId) throw new ForbiddenError();
    if (row.status !== "pending_upload") {
      throw new ConflictError(`Video cannot be confirmed from status "${row.status}"`);
    }

    await publishVideoJob(videoId);
    await videoQueries.updateStatus(videoId, "uploading");
  },
};

function toVideo(row: any, downloadUrl?: string): Video {
  return {
    id: row.id,
    userId: row.userId,
    filename: row.filename,
    originalSize: row.originalSize,
    outputSize: row.outputSize,
    status: row.status as VideoStatus,
    progress: row.progress,
    options: JSON.parse(row.options),
    errorMessage: row.errorMessage,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    processingStartedAt: row.processingStartedAt
      ? row.processingStartedAt instanceof Date
        ? row.processingStartedAt.toISOString()
        : String(row.processingStartedAt)
      : null,
    completedAt: row.completedAt
      ? row.completedAt instanceof Date
        ? row.completedAt.toISOString()
        : String(row.completedAt)
      : null,
    downloadUrl,
  };
}

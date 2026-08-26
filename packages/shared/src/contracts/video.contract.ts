export type Crop = {
  w: number;
  h: number;
  x: number;
  y: number;
};

export type CompressOptions = {
  crf: number;
  maxResolution: number;
  targetSizeBytes?: number;
  start?: string;
  end?: string;
  crop?: Crop;
};

export type VideoStatus = "pending_upload" | "uploading" | "processing" | "completed" | "failed";

export type Video = {
  id: string;
  userId: string;
  filename: string;
  originalSize: number;
  outputSize: number | null;
  status: VideoStatus;
  progress: number;
  options: CompressOptions;
  errorMessage: string | null;
  createdAt: string;
  processingStartedAt: string | null;
  completedAt: string | null;
  downloadUrl?: string;
};

export type CreateVideoRequest = {
  filename: string;
  fileSize: number;
  contentType: string;
  options: CompressOptions;
};

export type CreateVideoResponse = {
  video: Video;
  uploadUrl: string;
  uploadKey: string;
};

export type VideoCallbackRequest = {
  status: "completed" | "failed";
  outputKey?: string;
  outputSize?: number;
  errorMessage?: string;
};

export type VideoDownloadResponse = {
  downloadUrl: string;
};

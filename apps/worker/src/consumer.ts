import amqplib from "amqplib";
import {
  downloadToFile,
  getEnvOrThrowError,
  VideoNotFoundError,
  uploadFile,
} from "@video-compressor/shared";
import { videoQueries } from "@video-compressor/database";
import { compressVideo } from "./processor";

const COMPRESSION_QUEUE = getEnvOrThrowError("RABBITMQ_QUEUE");
const PROGRESS_QUEUE = getEnvOrThrowError("RABBITMQ_PROGRESS_QUEUE");
const COMPLETION_QUEUE = getEnvOrThrowError("RABBITMQ_COMPLETION_QUEUE");

const JOB_TIMEOUT_MS = 10 * 60 * 1000;

let channel: amqplib.Channel | null = null;

export async function connect(): Promise<void> {
  const conn = await amqplib.connect(getEnvOrThrowError("RABBITMQ_URL"));

  conn.on("error", (err) => {
    console.error("[amqp] connection error:", err);
  });

  const ch = await conn.createChannel();

  await ch.assertQueue(COMPRESSION_QUEUE, { durable: true });
  await ch.assertQueue(PROGRESS_QUEUE, { durable: true });
  await ch.assertQueue(COMPLETION_QUEUE, { durable: true });

  ch.prefetch(1);

  channel = ch;

  ch.consume(COMPRESSION_QUEUE, (msg) => {
    if (msg) void handleMessage(msg);
  });

  return new Promise((resolve) => {
    conn.on("close", () => {
      console.warn("[amqp] connection closed, worker will reconnect");
      channel = null;
      resolve();
    });
  });
}

async function handleMessage(msg: amqplib.Message): Promise<void> {
  let videoId = "unknown";

  try {
    const parsed = JSON.parse(msg.content.toString()) as { videoId?: unknown };
    if (typeof parsed.videoId !== "string") throw new Error("Malformed job message");
    videoId = parsed.videoId;

    console.log(`📥 Processing video: ${videoId}`);

    await withTimeout(processJob(videoId), JOB_TIMEOUT_MS);

    safeAck(msg);
  } catch (err) {
    console.error(`❌ Failed: ${videoId}`, err);
    try {
      await publishCompletion(videoId, "failed", {
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      });
    } catch (publishErr) {
      console.error(`❌ Could not publish failure for ${videoId}:`, publishErr);
    }
    safeAck(msg);
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Job timed out after ${ms / 1000}s`)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function safeAck(msg: amqplib.Message): void {
  try {
    channel?.ack(msg);
  } catch (err) {
    console.error("[amqp] ack failed:", err);
  }
}

async function processJob(videoId: string): Promise<void> {
  const row = await videoQueries.findById(videoId);
  if (!row) throw new VideoNotFoundError();

  const options = JSON.parse(row.options);

  await videoQueries.markProcessing(videoId);

  const ext = row.filename.split(".").pop() || "mp4";
  const baseName = row.filename.replace(/\.[^.]+$/, "") || "video";
  const originalPath = `/tmp/${videoId}_original.${ext}`;
  const outputPath = `/tmp/${videoId}_compressed.${ext}`;

  try {
    await downloadToFile(row.originalKey, originalPath);

    await compressVideo(originalPath, outputPath, options, (progress) => {
      publishProgress(videoId, progress);
    });

    const outputKey = `outputs/${videoId}/${baseName}-compressed.${ext}`;
    const outputSize = await uploadFile(outputPath, outputKey);

    await publishCompletion(videoId, "completed", { outputKey, outputSize });

    console.log(`✅ Done: ${videoId}`);
  } finally {
    Bun.spawn(["rm", "-f", originalPath, outputPath]);
  }
}

function publishProgress(videoId: string, progress: number): void {
  try {
    channel?.sendToQueue(PROGRESS_QUEUE, Buffer.from(JSON.stringify({ videoId, progress })), {
      persistent: true,
    });
  } catch (err) {
    console.error("[amqp] progress publish failed:", err);
  }
}

async function publishCompletion(
  videoId: string,
  status: "completed" | "failed",
  data: { outputKey?: string; outputSize?: number; errorMessage?: string },
): Promise<void> {
  const ch = channel;
  if (!ch) throw new Error("RabbitMQ channel is not available");

  ch.sendToQueue(
    COMPLETION_QUEUE,
    Buffer.from(JSON.stringify({ videoId, status, ...data })),
    { persistent: true },
  );
}

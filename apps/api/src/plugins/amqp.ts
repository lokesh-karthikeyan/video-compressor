import amqplib from "amqplib";
import { getEnvOrThrowError } from "@video-compressor/shared";

const COMPRESSION_QUEUE = getEnvOrThrowError("RABBITMQ_QUEUE");
const PROGRESS_QUEUE = getEnvOrThrowError("RABBITMQ_PROGRESS_QUEUE");
const COMPLETION_QUEUE = getEnvOrThrowError("RABBITMQ_COMPLETION_QUEUE");

const RECONNECT_INITIAL_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

type ProgressHandler = (videoId: string, progress: number) => Promise<void>;
type CompletionData = { outputKey?: string; outputSize?: number; errorMessage?: string };
type CompletionHandler = (
  videoId: string,
  status: "completed" | "failed",
  data: CompletionData,
) => Promise<void>;

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.Channel | null = null;
let connecting: Promise<amqplib.Channel> | null = null;

let progressHandler: ProgressHandler | null = null;
let completionHandler: CompletionHandler | null = null;

const attachedChannels = new WeakSet<amqplib.Channel>();

async function getChannel(): Promise<amqplib.Channel> {
  if (channel) return channel;

  if (!connecting) {
    connecting = openChannel().finally(() => {
      connecting = null;
    });
  }

  return connecting;
}

async function openChannel(): Promise<amqplib.Channel> {
  const conn = await amqplib.connect(getEnvOrThrowError("RABBITMQ_URL"));

  conn.on("error", (err) => {
    console.error("[amqp] connection error:", err);
  });

  conn.on("close", () => {
    console.warn("[amqp] connection closed, reconnecting...");
    connection = null;
    channel = null;
    scheduleReconnect();
  });

  const ch = await conn.createChannel();

  await ch.assertQueue(COMPRESSION_QUEUE, { durable: true });
  await ch.assertQueue(PROGRESS_QUEUE, { durable: true });
  await ch.assertQueue(COMPLETION_QUEUE, { durable: true });

  channel = ch;
  attachConsumers(ch);

  return ch;
}

function attachConsumers(ch: amqplib.Channel): void {
  if (attachedChannels.has(ch)) return;

  if (progressHandler) {
    ch.consume(PROGRESS_QUEUE, (msg) => {
      if (msg) void handleProgressMessage(ch, msg);
    });
  }

  if (completionHandler) {
    ch.consume(COMPLETION_QUEUE, (msg) => {
      if (msg) void handleCompletionMessage(ch, msg);
    });
  }

  attachedChannels.add(ch);

  if (progressHandler || completionHandler) {
    console.log("[amqp] consumers attached");
  }
}

async function handleProgressMessage(ch: amqplib.Channel, msg: amqplib.Message): Promise<void> {
  try {
    const parsed = JSON.parse(msg.content.toString()) as {
      videoId?: unknown;
      progress?: unknown;
    };

    if (typeof parsed.videoId === "string" && typeof parsed.progress === "number") {
      await progressHandler?.(parsed.videoId, parsed.progress);
    }
  } catch (err) {
    console.error("[amqp] progress message error:", err);
  } finally {
    safeAck(ch, msg);
  }
}

async function handleCompletionMessage(ch: amqplib.Channel, msg: amqplib.Message): Promise<void> {
  try {
    const parsed = JSON.parse(msg.content.toString()) as Record<string, unknown>;

    const videoId = parsed.videoId;
    const status = parsed.status;
    const validStatus = status === "completed" || status === "failed";

    if (typeof videoId === "string" && validStatus) {
      await completionHandler?.(videoId, status, {
        outputKey:
          typeof parsed.outputKey === "string" ? parsed.outputKey : undefined,
        outputSize:
          typeof parsed.outputSize === "number" ? parsed.outputSize : undefined,
        errorMessage:
          typeof parsed.errorMessage === "string" ? parsed.errorMessage : undefined,
      });
    }
  } catch (err) {
    console.error("[amqp] completion message error:", err);
  } finally {
    safeAck(ch, msg);
  }
}

function safeAck(ch: amqplib.Channel, msg: amqplib.Message): void {
  try {
    ch.ack(msg);
  } catch (err) {
    console.error("[amqp] ack failed:", err);
  }
}

function scheduleReconnect(attempt = 1): void {
  const delay = Math.min(RECONNECT_INITIAL_MS * 2 ** (attempt - 1), RECONNECT_MAX_MS);

  setTimeout(() => {
    getChannel().catch(() => scheduleReconnect(attempt + 1));
  }, delay);
}

export async function publishVideoJob(videoId: string): Promise<void> {
  const ch = await getChannel();
  ch.sendToQueue(COMPRESSION_QUEUE, Buffer.from(JSON.stringify({ videoId })), {
    persistent: true,
  });
}

export function consumeProgressUpdates(handler: ProgressHandler): void {
  progressHandler = handler;
  getChannel()
    .then((ch) => attachConsumers(ch))
    .catch((err) => console.error("[amqp] progress consumer startup failed:", err));
}

export function consumeCompletions(handler: CompletionHandler): void {
  completionHandler = handler;
  getChannel()
    .then((ch) => attachConsumers(ch))
    .catch((err) => console.error("[amqp] completion consumer startup failed:", err));
}

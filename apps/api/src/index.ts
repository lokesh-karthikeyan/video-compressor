import Elysia from "elysia";
import { bearerPlugin, corsPlugin, jwtPlugin } from "./plugins";
import { errorHandler } from "./middleware";
import { getEnvOrThrowError } from "@video-compressor/shared";
import * as modules from "./modules";
import { consumeCompletions, consumeProgressUpdates } from "./plugins/amqp";

const api = new Elysia()
  .use(corsPlugin)
  .use(jwtPlugin)
  .use(bearerPlugin)
  .onError(({ error, set }) => {
    const response = errorHandler({ error });
    set.status = response.statusCode;
    return response;
  })
  .use(modules.authRoutes)
  .use(modules.videoRoutes)
  .listen(getEnvOrThrowError("PORT"));

consumeProgressUpdates(async (videoId, progress) => {
  const { videoQueries } = await import("@video-compressor/database");
  await videoQueries.updateProgress(videoId, progress);
});

consumeCompletions(async (videoId, status, data) => {
  const { videoQueries } = await import("@video-compressor/database");
  if (status === "completed" && data.outputKey && data.outputSize) {
    await videoQueries.markCompleted(videoId, data.outputKey, data.outputSize);
  } else {
    await videoQueries.markFailed(videoId, data.errorMessage || "Processing failed");
  }
});

console.log(`🚀 API running at ${api.server?.hostname}:${api.server?.port}`);

export type App = typeof api;

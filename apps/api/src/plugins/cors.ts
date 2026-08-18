import cors from "@elysiajs/cors";
import { getEnvOrThrowError } from "@video-compressor/shared";

export const corsPlugin = cors({
  origin: getEnvOrThrowError("FRONTEND_URL"),
  credentials: true,
});

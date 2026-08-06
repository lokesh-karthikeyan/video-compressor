import { defineConfig } from "drizzle-kit";
import { getEnvOrThrowError } from "@video-compressor/shared";

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./migrations",
  dialect: "turso",
  dbCredentials: {
    url: getEnvOrThrowError("DATABASE_URL"),
  },
});

import { createClient } from "@libsql/client";
import { getEnvOrThrowError } from "@video-compressor/shared";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: getEnvOrThrowError("DATABASE_URL"),
});

export const db = drizzle(client, { schema });

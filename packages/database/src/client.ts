import { createClient } from "@libsql/client";
import { getEnvOrThrowError } from "@video-compressor/shared";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: getEnvOrThrowError("DATABASE_URL"),
});

await client.execute("PRAGMA journal_mode = WAL");
await client.execute("PRAGMA busy_timeout = 5000");

export const db = drizzle(client, { schema });

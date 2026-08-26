import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./user";

export const videos = sqliteTable("videos", {
  id: text("id")
    .$defaultFn(() => Bun.randomUUIDv7())
    .primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  filename: text("filename").notNull(),
  originalKey: text("original_key").notNull(),
  outputKey: text("output_key"),
  originalSize: integer("original_size").notNull(),
  outputSize: integer("output_size"),
  status: text("status").notNull().default("pending_upload"),
  progress: real("progress").notNull().default(0),
  options: text("options").notNull(),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  processingStartedAt: integer("processing_started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export type VideoRow = typeof videos.$inferSelect;
export type NewVideoRow = typeof videos.$inferInsert;

import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import { videos, type NewVideoRow } from "../schema";

export const videoQueries = {
  async create(data: NewVideoRow) {
    const [row] = await db.insert(videos).values(data).returning();
    return row;
  },

  async findById(id: string) {
    const [row] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return row;
  },

  async findByUserId(userId: string) {
    return db
      .select()
      .from(videos)
      .where(eq(videos.userId, userId))
      .orderBy(desc(videos.createdAt));
  },

  async updateStatus(id: string, status: string) {
    const [row] = await db.update(videos).set({ status }).where(eq(videos.id, id)).returning();
    return row;
  },

  async updateProgress(id: string, progress: number) {
    const [row] = await db.update(videos).set({ progress }).where(eq(videos.id, id)).returning();
    return row;
  },

  async markProcessing(id: string) {
    const [row] = await db
      .update(videos)
      .set({ status: "processing", processingStartedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return row;
  },

  async markCompleted(id: string, outputKey: string, outputSize: number) {
    const [row] = await db
      .update(videos)
      .set({ status: "completed", progress: 1, outputKey, outputSize, completedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return row;
  },

  async markFailed(id: string, errorMessage: string) {
    const [row] = await db
      .update(videos)
      .set({ status: "failed", errorMessage })
      .where(eq(videos.id, id))
      .returning();
    return row;
  },

  async delete(id: string) {
    const result = await db.delete(videos).where(eq(videos.id, id));
    return result.rowsAffected > 0;
  },
};

import {
  ANON_DAILY_LIMIT,
  ANON_MAX_SIZE,
  STORAGE_KEY,
  MESSAGES,
} from "./constants";
import type { CompressionRecord } from "./types";

export const rateLimiter = {
  canCompress(
    fileSize: number,
    isAuthenticated: boolean,
  ): { ok: boolean; reason?: string } {
    if (isAuthenticated) return { ok: true };

    if (fileSize > ANON_MAX_SIZE)
      return {
        ok: false,
        reason: MESSAGES.SIGN_IN_FOR_LARGE_FILE,
      };

    const remaining = this.getRemaining();
    if (remaining <= 0)
      return {
        ok: false,
        reason: MESSAGES.DAILY_LIMIT_REACHED,
      };

    return { ok: true };
  },

  recordCompression(): void {
    const records = this.getRecords();
    const today = new Date().toISOString().split("T")[0];
    const existing = records.find((record) => record.date === today);

    if (existing) existing.count++;
    else records.push({ date: today, count: 1 });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  },

  getRemaining(): number {
    const records = this.getRecords();
    const today = new Date().toISOString().split("T")[0];
    const todayRecord = records.find((record) => record.date === today);
    return ANON_DAILY_LIMIT - (todayRecord?.count ?? 0);
  },

  getRecords(): CompressionRecord[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  },
};

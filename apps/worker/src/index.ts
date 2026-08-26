import { connect } from "./consumer";

const INITIAL_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const RESET_THRESHOLD_MS = 10_000;

let delay = INITIAL_DELAY_MS;

console.log("🎬 Worker starting...");

while (true) {
  const startedAt = Date.now();

  try {
    await connect();
  } catch (err) {
    console.error(`❌ Connection failed: ${err instanceof Error ? err.message : err}`);
  }

  if (Date.now() - startedAt > RESET_THRESHOLD_MS) delay = INITIAL_DELAY_MS;

  console.warn(`⏳ Reconnecting in ${delay / 1000}s...`);
  await Bun.sleep(delay);
  delay = Math.min(delay * 2, MAX_DELAY_MS);
}

export const AUDIO_BITRATE_BPS = 128_000;
export const TARGET_SIZE_SAFETY = 0.96;
export const MIN_VIDEO_BITRATE_KBPS = 100;

export function computeVideoBitrateKbps(
  targetSizeBytes: number,
  durationSeconds: number,
): { videoKbps: number; audioBps: number } {
  const totalBps = (targetSizeBytes * 8 * TARGET_SIZE_SAFETY) / durationSeconds;
  const audioBps = Math.min(AUDIO_BITRATE_BPS, Math.round(totalBps * 0.25));
  const videoBps = Math.max(totalBps - audioBps, MIN_VIDEO_BITRATE_KBPS * 1000);
  return { videoKbps: Math.round(videoBps / 1000), audioBps };
}

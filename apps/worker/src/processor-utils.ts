import type { CompressOptions } from "@video-compressor/shared";

export function buildSeekArgs(options: CompressOptions): string[] {
  return options.start ? ["-ss", options.start] : [];
}

export function buildEndArgs(options: CompressOptions): string[] {
  return options.end ? ["-to", options.end] : [];
}

export function buildFilterArgs(options: CompressOptions): string[] {
  const filters: string[] = [];

  if (options.crop) {
    const { w, h, x, y } = options.crop;
    filters.push(`crop=${w}:${h}:${x}:${y}`);
  }

  if (options.maxResolution) {
    filters.push(
      `scale=w='if(gt(iw,ih),-2,${options.maxResolution})':h='if(gt(iw,ih),${options.maxResolution},-2)':force_original_aspect_ratio=decrease`,
    );
  }

  return filters.length > 0 ? ["-vf", filters.join(",")] : [];
}

export function emitProgress(
  line: string,
  duration: number,
  onProgress: (progress: number) => void,
): void {
  const match = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
  if (!match || duration <= 0) return;

  const [, h = "0", m = "0", s = "0"] = match;
  const seconds = parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseFloat(s);

  onProgress(Math.min(seconds / duration, 1));
}

export function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

import { computeVideoBitrateKbps } from "@video-compressor/shared";
import type { CompressOptions } from "@video-compressor/shared";
import { buildSeekArgs, buildEndArgs, buildFilterArgs, emitProgress, formatBytes } from "./processor-utils";

const FFMPEG_TIMEOUT_MS = 10 * 60 * 1000;
const FFPROBE_TIMEOUT_MS = 30 * 1000;

export async function compressVideo(
  inputPath: string,
  outputPath: string,
  options: CompressOptions,
  onProgress: (progress: number) => void,
): Promise<void> {
  const duration = await getVideoDuration(inputPath);

  if (options.targetSizeBytes && duration > 0) {
    await compressTwoPass(inputPath, outputPath, options, duration, onProgress);
  } else {
    await compressCrf(inputPath, outputPath, options, duration, onProgress);
  }

  onProgress(1);
}

async function compressCrf(
  inputPath: string,
  outputPath: string,
  options: CompressOptions,
  duration: number,
  onProgress: (progress: number) => void,
): Promise<void> {
  const args = [
    ...buildSeekArgs(options),
    "-i",
    inputPath,
    ...buildFilterArgs(options),
    "-c:v",
    "libx264",
    "-crf",
    String(options.crf),
    "-preset",
    "fast",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    ...buildEndArgs(options),
    outputPath,
  ];

  await runFFmpeg(args, duration, onProgress, 0, 0.95);
}

async function compressTwoPass(
  inputPath: string,
  outputPath: string,
  options: CompressOptions,
  duration: number,
  onProgress: (progress: number) => void,
): Promise<void> {
  const { videoKbps, audioBps } = computeVideoBitrateKbps(options.targetSizeBytes!, duration);
  const passLog = `/tmp/pass_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  console.log(`[two-pass] target=${formatBytes(options.targetSizeBytes!)} duration=${duration.toFixed(1)}s -> video ${videoKbps}kbps, audio ${Math.round(audioBps / 1000)}kbps`);

  try {
    const pass1Args = [
      ...buildSeekArgs(options),
      "-i",
      inputPath,
      ...buildFilterArgs(options),
      "-fps_mode",
      "cfr",
      "-c:v",
      "libx264",
      "-b:v",
      `${videoKbps}k`,
      "-preset",
      "fast",
      "-pass",
      "1",
      "-passlogfile",
      passLog,
      "-an",
      "-f",
      "null",
      "/dev/null",
    ];

    try {
      await runFFmpeg(pass1Args, duration, onProgress, 0, 0.45);
    } catch (err) {
      throw new Error(`[pass 1] ${err instanceof Error ? err.message : err}`);
    }

    const pass2Args = [
      ...buildSeekArgs(options),
      "-i",
      inputPath,
      ...buildFilterArgs(options),
      "-fps_mode",
      "cfr",
      "-c:v",
      "libx264",
      "-b:v",
      `${videoKbps}k`,
      "-preset",
      "fast",
      "-pass",
      "2",
      "-passlogfile",
      passLog,
      "-c:a",
      "aac",
      "-b:a",
      `${Math.round(audioBps / 1000)}k`,
      "-movflags",
      "+faststart",
      ...buildEndArgs(options),
      outputPath,
    ];

    try {
      await runFFmpeg(pass2Args, duration, onProgress, 0.45, 0.95);
    } catch (err) {
      throw new Error(`[pass 2] ${err instanceof Error ? err.message : err}`);
    }
  } finally {
    Bun.spawn(["rm", "-f", `${passLog}-0.log`, `${passLog}-0.log.mbtree`]);
  }
}

async function runFFmpeg(
  args: string[],
  duration: number,
  onProgress: (progress: number) => void,
  from: number,
  to: number,
): Promise<void> {
  const proc = Bun.spawn(["ffmpeg", "-y", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const reader = proc.stderr.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const outputLines: string[] = [];

  const readLoop = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/[\r\n]+/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.trim()) {
          outputLines.push(line);
          if (outputLines.length > 500) outputLines.shift();
        }
        emitProgress(line, duration, (fraction) => onProgress(from + fraction * (to - from)));
      }
    }
  })();

  const exitCode = await raceWithTimeout(proc.exited, FFMPEG_TIMEOUT_MS, () => proc.kill());

  await readLoop.catch(() => {});
  try {
    reader.releaseLock();
  } catch {
    // stream already closed
  }

  if (buffer.trim()) outputLines.push(buffer.trim());

  if (exitCode !== 0) {
    const relevant = outputLines
      .filter((l) => /error|invalid|failed|no such|cannot|unable|not found/i.test(l))
      .slice(-5);
    const detail =
      relevant.length > 0 ? relevant.join("\n") : outputLines.slice(-8).join("\n");
    throw new Error(`FFmpeg failed with exit code ${exitCode}${detail ? `\n${detail}` : ""}`);
  }
}

async function raceWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      reject(new Error(`Process timed out after ${ms / 1000}s`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function getVideoDuration(filePath: string): Promise<number> {
  const proc = Bun.spawn(
    [
      "ffprobe",
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      filePath,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );

  const outputPromise = new Response(proc.stdout).text();
  await raceWithTimeout(proc.exited, FFPROBE_TIMEOUT_MS, () => proc.kill()).catch(() => {});

  let output = "";
  try {
    output = await outputPromise;
  } catch {
    return 0;
  }

  return parseFloat(output.trim()) || 0;
}

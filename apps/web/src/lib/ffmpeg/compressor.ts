import { computeVideoBitrateKbps } from "@video-compressor/shared/src/utils/compression";
import type { CompressOptions } from "$lib/types";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let progressCb: ((p: number) => void) | undefined;

let durationSec = 0;
let phase: 0 | 1 | 2 = 0;

async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance;

  if (!loading) {
    loading = (async () => {
      const ffmpeg = new FFmpeg();

      const base = "/ffmpeg";

      await ffmpeg.load({
        coreURL: `${base}/ffmpeg-core.js`,
        wasmURL: `${base}/ffmpeg-core.wasm`,
      });

      return ffmpeg;
    })();
  }

  instance = await loading;
  return instance;
}

export function resetFFmpeg(): void {
  if (instance) {
    instance.terminate();
    instance = null;
    loading = null;
  }
  durationSec = 0;
  phase = 0;
}

async function probeDuration(ffmpeg: FFmpeg, inputFile: string): Promise<number> {
  let captured = "";
  const handler = ({ message }: { message: string }) => {
    captured += `${message}\n`;
  };
  ffmpeg.on("log", handler);

  try {
    await ffmpeg.exec(["-i", inputFile]);
  } catch {
    // expected: no output specified -> non-zero exit; metadata still logged
  } finally {
    ffmpeg.off("log", handler);
  }

  const match = captured.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 0;

  return +match[1] * 3600 + +match[2] * 60 + parseFloat(match[3]);
}

async function compressTargetSize(
  ffmpeg: FFmpeg,
  input: string,
  output: string,
  opts: CompressOptions,
  duration: number,
  signal?: AbortSignal,
): Promise<void> {
  const { videoKbps, audioBps } = computeVideoBitrateKbps(opts.targetSizeBytes!, duration);
  const audioKbps = Math.round(audioBps / 1000);

  const args = ["-i", input];
  const filters: string[] = [];

  if (opts.crop && opts.crop.w > 0 && opts.crop.h > 0) {
    filters.push(`crop=${opts.crop.w}:${opts.crop.h}:${opts.crop.x}:${opts.crop.y}`);
  }
  if (opts.maxResolution > 0) {
    const max = opts.maxResolution;
    filters.push(
      `scale=w='if(gt(iw,ih),-2,${max})':h='if(gt(iw,ih),${max},-2)':force_original_aspect_ratio=decrease`,
    );
  }
  if (filters.length) args.push("-vf", filters.join(","));
  if (opts.start) args.push("-ss", opts.start);
  if (opts.end) args.push("-to", opts.end);

  args.push(
    "-c:v",
    "libx264",
    "-b:v",
    `${videoKbps}k`,
    "-maxrate",
    `${videoKbps}k`,
    "-bufsize",
    `${videoKbps * 2}k`,
    "-preset",
    "ultrafast",
    "-c:a",
    "aac",
    "-b:a",
    `${audioKbps}k`,
    output,
  );

  await ffmpeg.exec(args, undefined, { signal });
}

function buildCrfArgs(input: string, output: string, opts: CompressOptions): string[] {
  const args: string[] = ["-i", input];
  const filters: string[] = [];

  if (opts.crop && opts.crop.w > 0 && opts.crop.h > 0) {
    filters.push(`crop=${opts.crop.w}:${opts.crop.h}:${opts.crop.x}:${opts.crop.y}`);
  }
  if (opts.maxResolution > 0) {
    const max = opts.maxResolution;
    filters.push(
      `scale=w='if(gt(iw,ih),-2,${max})':h='if(gt(iw,ih),${max},-2)':force_original_aspect_ratio=decrease`,
    );
  }
  if (filters.length) args.push("-vf", filters.join(","));
  if (opts.start) args.push("-ss", opts.start);
  if (opts.end) args.push("-to", opts.end);

  args.push(
    "-c:v",
    "libx264",
    "-crf",
    String(opts.crf),
    "-preset",
    "ultrafast",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    output,
  );

  return args;
}

export async function compressVideo(
  file: File,
  opts: CompressOptions,
  onProgress?: (p: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  progressCb = onProgress;
  durationSec = 0;
  phase = 0;
  let fallbackProgress = 0;
  let realProgressReceived = false;

  const markReal = () => {
    realProgressReceived = true;
    clearInterval(timer);
  };

  const reportTime = (elapsed: number) => {
    if (durationSec <= 0) return;
    const ratio = Math.min(1, elapsed / durationSec);
    const scaled = phase === 1 ? ratio * 0.5 : phase === 2 ? 0.5 + ratio * 0.5 : ratio;
    markReal();
    progressCb?.(Math.min(0.99, scaled));
  };

  const timer = setInterval(() => {
    if (realProgressReceived) return;
    fallbackProgress = Math.min(0.9, fallbackProgress + 0.005);
    progressCb?.(fallbackProgress);
  }, 500);

  const onLog = ({ message }: { message: string }) => {
    const match = message.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (match) reportTime(+match[1] * 3600 + +match[2] * 60 + parseFloat(match[3]));
  };

  const onProgressEvent = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress) && progress > 0 && !realProgressReceived) {
      markReal();
      progressCb?.(Math.min(0.99, progress));
    }
  };

  try {
    const ffmpeg = await getFFmpeg();
    const input = "input.mp4";
    const output = "output.mp4";

    ffmpeg.on("log", onLog);
    ffmpeg.on("progress", onProgressEvent);

    await ffmpeg.writeFile(input, await fetchFile(file));

    const duration = await probeDuration(ffmpeg, input);
    durationSec = duration > 0 ? duration : 0;

    if (opts.targetSizeBytes && durationSec > 0) {
      await compressTargetSize(ffmpeg, input, output, opts, durationSec, signal);
    } else {
      await ffmpeg.exec(buildCrfArgs(input, output, opts), undefined, { signal });
    }

    ffmpeg.off("log", onLog);
    ffmpeg.off("progress", onProgressEvent);
    const data = (await ffmpeg.readFile(output)) as Uint8Array;
    const buffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(buffer).set(data);

    await ffmpeg.deleteFile(input);
    await ffmpeg.deleteFile(output);

    return new Blob([buffer], { type: "video/mp4" });
  } catch (error) {
    resetFFmpeg();
    throw error;
  } finally {
    clearInterval(timer);
    progressCb?.(1);
    progressCb = undefined;
  }
}

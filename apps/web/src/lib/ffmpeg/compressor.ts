import { computeVideoBitrateKbps } from "@video-compressor/shared";
import type { CompressOptions } from "$lib/types";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let progressCb: ((p: number) => void) | undefined;

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

async function deleteFileQuietly(ffmpeg: FFmpeg, path: string): Promise<void> {
  try {
    await ffmpeg.deleteFile(path);
  } catch {
    // file may not exist (e.g. mbtree disabled)
  }
}

async function compressTwoPass(
  ffmpeg: FFmpeg,
  input: string,
  output: string,
  opts: CompressOptions,
  duration: number,
  signal?: AbortSignal,
): Promise<void> {
  const { videoKbps, audioBps } = computeVideoBitrateKbps(opts.targetSizeBytes!, duration);
  const passTmp = "pass1.tmp.mp4";
  const passLog = "passlog";
  const audioKbps = Math.round(audioBps / 1000);

  const shared = ["-i", input];
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
  if (filters.length) shared.push("-vf", filters.join(","));
  if (opts.start) shared.push("-ss", opts.start);
  if (opts.end) shared.push("-to", opts.end);

  await ffmpeg.exec(
    [
      ...shared,
      "-c:v",
      "libx264",
      "-b:v",
      `${videoKbps}k`,
      "-preset",
      "ultrafast",
      "-pass",
      "1",
      "-passlogfile",
      passLog,
      "-an",
      passTmp,
    ],
    undefined,
    { signal },
  );

  try {
    await ffmpeg.exec(
      [
        ...shared,
        "-c:v",
        "libx264",
        "-b:v",
        `${videoKbps}k`,
        "-preset",
        "ultrafast",
        "-pass",
        "2",
        "-passlogfile",
        passLog,
        "-c:a",
        "aac",
        "-b:a",
        `${audioKbps}k`,
        output,
      ],
      undefined,
      { signal },
    );
  } finally {
    await deleteFileQuietly(ffmpeg, `${passLog}-0.log`);
    await deleteFileQuietly(ffmpeg, `${passLog}-0.log.mbtree`);
  }
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

  let fallbackProgress = 0;
  const timer = setInterval(() => {
    fallbackProgress = Math.min(0.95, fallbackProgress + 0.005);
    progressCb?.(fallbackProgress);
  }, 500);

  try {
    const ffmpeg = await getFFmpeg();
    const input = "input.mp4";
    const output = "output.mp4";

    await ffmpeg.writeFile(input, await fetchFile(file));

    if (opts.targetSizeBytes) {
      const duration = await probeDuration(ffmpeg, input);
      if (duration > 0) {
        await compressTwoPass(ffmpeg, input, output, opts, duration, signal);
      } else {
        await ffmpeg.exec(buildCrfArgs(input, output, opts), undefined, { signal });
      }
    } else {
      await ffmpeg.exec(buildCrfArgs(input, output, opts), undefined, { signal });
    }

    const data = (await ffmpeg.readFile(output)) as Uint8Array;
    const buffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(buffer).set(data);

    await ffmpeg.deleteFile(input);
    await ffmpeg.deleteFile(output);
    await deleteFileQuietly(ffmpeg, "pass1.tmp.mp4");

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

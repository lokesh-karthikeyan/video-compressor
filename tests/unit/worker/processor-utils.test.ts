import { describe, it, expect } from "bun:test";
import {
  buildSeekArgs,
  buildEndArgs,
  buildFilterArgs,
  emitProgress,
  formatBytes,
} from "../../../apps/worker/src/processor-utils";
import type { CompressOptions } from "@video-compressor/shared";

describe("buildSeekArgs", () => {
  it("returns -ss when start is set", () => {
    expect(buildSeekArgs({ start: "00:01:00" } as CompressOptions)).toEqual(["-ss", "00:01:00"]);
  });

  it("returns empty when no start", () => {
    expect(buildSeekArgs({} as CompressOptions)).toEqual([]);
  });

  it("returns empty when start is empty string", () => {
    expect(buildSeekArgs({ start: "" } as CompressOptions)).toEqual([]);
  });
});

describe("buildEndArgs", () => {
  it("returns -to when end is set", () => {
    expect(buildEndArgs({ end: "00:02:00" } as CompressOptions)).toEqual(["-to", "00:02:00"]);
  });

  it("returns empty when no end", () => {
    expect(buildEndArgs({} as CompressOptions)).toEqual([]);
  });
});

describe("buildFilterArgs", () => {
  it("returns empty when no filters", () => {
    expect(buildFilterArgs({} as CompressOptions)).toEqual([]);
  });

  it("builds crop filter", () => {
    const result = buildFilterArgs({
      crop: { w: 100, h: 200, x: 10, y: 20 },
    } as CompressOptions);
    expect(result).toEqual(["-vf", "crop=100:200:10:20"]);
  });

  it("builds scale filter", () => {
    const result = buildFilterArgs({ maxResolution: 720 } as CompressOptions);
    expect(result).toEqual([
      "-vf",
      "scale=w='if(gt(iw,ih),-2,720)':h='if(gt(iw,ih),720,-2)':force_original_aspect_ratio=decrease",
    ]);
  });

  it("combines crop and scale filters", () => {
    const result = buildFilterArgs({
      crop: { w: 300, h: 300, x: 0, y: 0 },
      maxResolution: 1080,
    } as CompressOptions);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("-vf");
    expect(result[1]).toContain("crop=300:300:0:0");
    expect(result[1]).toContain("scale=");
  });
});

describe("emitProgress", () => {
  it("parses HH:MM:SS.ms time and computes fraction", () => {
    const calls: number[] = [];
    emitProgress("time=00:01:30.00", 180, (p) => calls.push(p));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBeCloseTo(0.5, 2);
  });

  it("clamps to 1.0 when time exceeds duration", () => {
    const calls: number[] = [];
    emitProgress("time=00:05:00.00", 120, (p) => calls.push(p));
    expect(calls[0]).toBe(1);
  });

  it("does not call callback for non-matching lines", () => {
    const calls: number[] = [];
    emitProgress("frame=100 fps=30", 180, (p) => calls.push(p));
    expect(calls).toHaveLength(0);
  });

  it("does not call callback when duration is 0", () => {
    const calls: number[] = [];
    emitProgress("time=00:01:00.00", 0, (p) => calls.push(p));
    expect(calls).toHaveLength(0);
  });

  it("handles hours correctly", () => {
    const calls: number[] = [];
    emitProgress("time=01:00:00.00", 7200, (p) => calls.push(p));
    expect(calls[0]).toBeCloseTo(0.5, 2);
  });
});

describe("formatBytes", () => {
  it("formats MB correctly", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0MB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10.0MB");
  });

  it("formats fractional MB", () => {
    expect(formatBytes(512 * 1024)).toBe("0.5MB");
  });

  it("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0.0MB");
  });
});

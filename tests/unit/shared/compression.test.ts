import { describe, it, expect } from "bun:test";
import {
  computeVideoBitrateKbps,
  AUDIO_BITRATE_BPS,
  TARGET_SIZE_SAFETY,
  MIN_VIDEO_BITRATE_KBPS,
} from "../../../packages/shared/src/utils/compression";

describe("computeVideoBitrateKbps", () => {
  it("returns reasonable bitrate for normal case", () => {
    const target = 10 * 1024 * 1024;
    const duration = 60;

    const { videoKbps, audioBps } = computeVideoBitrateKbps(target, duration);

    expect(videoKbps).toBeGreaterThan(0);
    expect(audioBps).toBeGreaterThan(0);
    expect(audioBps).toBeLessThanOrEqual(AUDIO_BITRATE_BPS);
  });

  it("applies TARGET_SIZE_SAFETY factor", () => {
    const target = 10 * 1024 * 1024;
    const duration = 60;
    const { videoKbps } = computeVideoBitrateKbps(target, duration);

    const totalBps = (target * 8 * TARGET_SIZE_SAFETY) / duration;
    const expectedVideoBps = totalBps - Math.min(AUDIO_BITRATE_BPS, totalBps * 0.25);
    expect(videoKbps).toBe(Math.round(expectedVideoBps / 1000));
  });

  it("caps audio at AUDIO_BITRATE_BPS", () => {
    const target = 100 * 1024 * 1024;
    const duration = 10;

    const { audioBps } = computeVideoBitrateKbps(target, duration);

    expect(audioBps).toBe(AUDIO_BITRATE_BPS);
  });

  it("audio gets 25% when below cap", () => {
    const target = 500 * 1024;
    const duration = 60;

    const { audioBps } = computeVideoBitrateKbps(target, duration);
    const totalBps = (target * 8 * TARGET_SIZE_SAFETY) / duration;
    const expectedAudio = Math.round(totalBps * 0.25);

    expect(audioBps).toBe(expectedAudio);
    expect(audioBps).toBeLessThan(AUDIO_BITRATE_BPS);
  });

  it("hits MIN_VIDEO_BITRATE_KBPS floor for very long video", () => {
    const target = 1024 * 1024;
    const duration = 3600;

    const { videoKbps } = computeVideoBitrateKbps(target, duration);

    expect(videoKbps).toBe(MIN_VIDEO_BITRATE_KBPS);
  });

  it("hits MIN_VIDEO_BITRATE_KBPS floor for tiny target", () => {
    const target = 1024;
    const duration = 10;

    const { videoKbps } = computeVideoBitrateKbps(target, duration);

    expect(videoKbps).toBe(MIN_VIDEO_BITRATE_KBPS);
  });

  it("returns positive values for short video", () => {
    const { videoKbps, audioBps } = computeVideoBitrateKbps(10 * 1024 * 1024, 1);

    expect(videoKbps).toBeGreaterThan(0);
    expect(audioBps).toBeGreaterThan(0);
  });

  it("video bitrate scales with target size", () => {
    const small = computeVideoBitrateKbps(1 * 1024 * 1024, 60);
    const large = computeVideoBitrateKbps(50 * 1024 * 1024, 60);

    expect(large.videoKbps).toBeGreaterThan(small.videoKbps);
  });

  it("video bitrate scales inversely with duration", () => {
    const short = computeVideoBitrateKbps(10 * 1024 * 1024, 30);
    const long = computeVideoBitrateKbps(10 * 1024 * 1024, 300);

    expect(short.videoKbps).toBeGreaterThan(long.videoKbps);
  });
});

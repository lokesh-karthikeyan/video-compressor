import { describe, it, expect, beforeAll } from "bun:test";

const API = process.env.API_URL ?? "http://localhost:3000";
const SAMPLE = new URL("../fixtures/sample.mp4", import.meta.url).pathname;

type AuthResponse = { user: { id: string }; accessToken: string; refreshToken: string };
type CreateVideoResponse = { video: { id: string }; uploadUrl: string };

let apiUp = false;

beforeAll(async () => {
  try {
    await fetch(`${API}/auth/me`);
    apiUp = true;
  } catch {
    apiUp = false;
  }
});

function skipIfDown() {
  return !apiUp;
}

async function registerUser(prefix: string): Promise<AuthResponse> {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${prefix} User`,
      email: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      password: "password123",
    }),
  });
  return (await res.json()) as AuthResponse;
}

async function createVideo(auth: AuthResponse, options: object) {
  const body = {
    filename: "sample.mp4",
    fileSize: (await Bun.file(SAMPLE).size) || 1,
    contentType: "video/mp4",
    options,
  };
  return fetch(`${API}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

async function uploadToS3(uploadUrl: string): Promise<Response> {
  return fetch(uploadUrl, {
    method: "PUT",
    body: Bun.file(SAMPLE),
    headers: { "Content-Type": "video/mp4" },
  });
}

async function pollUntilTerminal(
  videoId: string,
  token: string,
  timeoutMs = 120_000,
): Promise<{ status: string; progress: number; errorMessage?: string; downloadUrl?: string; outputSize?: number }> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${API}/videos/${videoId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const video = (await res.json()) as { status: string; progress: number; errorMessage?: string; downloadUrl?: string; outputSize?: number };
      if (video.status === "completed" || video.status === "failed") return video;
    }

    await Bun.sleep(1000);
  }

  throw new Error("Poll timed out");
}

describe("Video compression (happy path)", () => {
  it("create → upload → confirm → poll → completed", async () => {
    if (skipIfDown()) return;

    const user = await registerUser("video-happy");

    const createRes = await createVideo(user, { crf: 28, maxResolution: 720 });
    const created = (await createRes.json()) as CreateVideoResponse;
    expect(createRes.ok).toBe(true);
    expect(created.uploadUrl).toBeString();
    expect(created.video.id).toBeString();

    const videoId = created.video.id as string;

    const up = await uploadToS3(created.uploadUrl);
    expect(up.ok).toBe(true);

    const confirmRes = await fetch(`${API}/videos/${videoId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(confirmRes.ok).toBe(true);

    const final = await pollUntilTerminal(videoId, user.accessToken);
    expect(final.status).toBe("completed");

    const dl = await fetch(final.downloadUrl!);
    expect(dl.ok).toBe(true);
    const bytes = await dl.arrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(0);

    const originalSize = (await Bun.file(SAMPLE).size) || 0;
    expect(final.outputSize!).toBeLessThan(originalSize);
  });
});

describe("Video compression (target-size two-pass)", () => {
  it("output respects target size + 15% tolerance", async () => {
    if (skipIfDown()) return;

    const user = await registerUser("video-target");
    const TARGET = 150 * 1024;

    const createRes = await createVideo(user, {
      crf: 30,
      maxResolution: 720,
      targetSizeBytes: TARGET,
    });
    const created = (await createRes.json()) as CreateVideoResponse;
    expect(createRes.ok).toBe(true);

    await uploadToS3(created.uploadUrl);
    await fetch(`${API}/videos/${created.video.id}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    const final = await pollUntilTerminal(created.video.id, user.accessToken);
    expect(final.status).toBe("completed");
    expect(final.outputSize!).toBeLessThanOrEqual(TARGET * 1.15);
    expect(final.downloadUrl!).toContain("-compressed.mp4");
  });
});

describe("Video compression (failure path)", () => {
  it("invalid crop → failed status with error message", async () => {
    if (skipIfDown()) return;

    const user = await registerUser("video-fail");

    const createRes = await createVideo(user, {
      crf: 28,
      maxResolution: 720,
      crop: { w: 1_000_000, h: 1_000_000, x: 0, y: 0 },
    });
    const created = (await createRes.json()) as CreateVideoResponse;
    expect(createRes.ok).toBe(true);

    await uploadToS3(created.uploadUrl);
    await fetch(`${API}/videos/${created.video.id}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    const final = await pollUntilTerminal(created.video.id, user.accessToken);
    expect(final.status).toBe("failed");
    expect(final.errorMessage).toBeString();
  });
});

describe("Video authorization", () => {
  it("createVideo rejects invalid payload", async () => {
    if (skipIfDown()) return;

    const user = await registerUser("video-auth");
    const res = await fetch(`${API}/videos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.accessToken}`,
      },
      body: JSON.stringify({ filename: "", fileSize: 0, contentType: "", options: {} }),
    });

    expect(res.status === 400 || res.status === 422).toBe(true);
  });

  it("video route requires token", async () => {
    if (skipIfDown()) return;

    const res = await fetch(`${API}/videos/abc123`);
    expect(res.status).toBe(401);
  });

  it("user B cannot read user A video", async () => {
    if (skipIfDown()) return;

    const userA = await registerUser("video-cross-a");
    const userB = await registerUser("video-cross-b");

    const createRes = await createVideo(userA, { crf: 28, maxResolution: 720 });
    const created = (await createRes.json()) as CreateVideoResponse;
    const videoId = created.video.id as string;

    const res = await fetch(`${API}/videos/${videoId}`, {
      headers: { Authorization: `Bearer ${userB.accessToken}` },
    });

    expect(res.status === 403 || res.status === 404).toBe(true);
  });

  it("second confirm rejected with 409", async () => {
    if (skipIfDown()) return;

    const user = await registerUser("video-confirm");
    const createRes = await createVideo(user, { crf: 28, maxResolution: 720 });
    const created = (await createRes.json()) as CreateVideoResponse;
    const videoId = created.video.id as string;

    await uploadToS3(created.uploadUrl);

    const first = await fetch(`${API}/videos/${videoId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(first.ok).toBe(true);

    const second = await fetch(`${API}/videos/${videoId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(second.status).toBe(409);
  });
});

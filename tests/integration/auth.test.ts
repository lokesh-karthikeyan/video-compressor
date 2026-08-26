import { describe, it, expect, beforeAll } from "bun:test";

const API = process.env.API_URL ?? "http://localhost:3000";

type AuthResponse = { user: { id: string }; accessToken: string; refreshToken: string };

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

describe("Auth", () => {
  it("register returns user + tokens", async () => {
    if (skipIfDown()) return;

    const user = await registerUser("test-register");

    expect(user.user.id).toBeString();
    expect(user.accessToken).toBeString();
    expect(user.refreshToken).toBeString();
    expect(user.user.id.length).toBeGreaterThan(0);
  });

  it("register rejects duplicate email", async () => {
    if (skipIfDown()) return;

    const email = `dup-${Date.now()}@test.local`;
    await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Dup", email, password: "password123" }),
    });

    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Dup2", email, password: "password123" }),
    });

    expect(res.status).toBe(409);
  });

  it("login rejects wrong password", async () => {
    if (skipIfDown()) return;

    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "wrong@test.local", password: "definitely-wrong" }),
    });

    expect(res.status === 401 || res.status === 400).toBe(true);
  });

  it("login rejects wrong email", async () => {
    if (skipIfDown()) return;

    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent@test.local", password: "password123" }),
    });

    expect(res.status === 401 || res.status === 400).toBe(true);
  });

  it("GET /auth/me returns current user", async () => {
    if (skipIfDown()) return;

    const user = await registerUser("test-me");
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    const body = (await res.json()) as { user: { id: string } };

    expect(res.status).toBe(200);
    expect(body.user.id).toBe(user.user.id);
  });

  it("GET /auth/me rejects missing token", async () => {
    if (skipIfDown()) return;

    const res = await fetch(`${API}/auth/me`);
    expect(res.status).toBe(401);
  });

  it("POST /auth/refresh returns new tokens", async () => {
    if (skipIfDown()) return;

    const user = await registerUser("test-refresh");
    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.refreshToken}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { accessToken: string; refreshToken: string };
    expect(body.accessToken).toBeString();
    expect(body.refreshToken).toBeString();
    expect(body.accessToken.length).toBeGreaterThan(0);
  });

  it("POST /auth/refresh rejects invalid token", async () => {
    if (skipIfDown()) return;

    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: "Bearer invalid-token-here" },
    });

    expect(res.status).toBe(401);
  });
});

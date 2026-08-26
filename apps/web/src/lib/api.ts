import { get } from "svelte/store";
import { auth } from "$lib";
import type { AuthResponse, Video } from "@video-compressor/shared";
import type { CreateVideoData } from "$lib/types";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) throw new Error("VITE_API_URL is not set");

let refreshInFlight: Promise<boolean> | null = null;

async function buildHeaders(
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const { accessToken } = get(auth);
  const headers: Record<string, string> = { ...(extra ?? {}) };

  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  return headers;
}

async function refreshSession(): Promise<boolean> {
  const { refreshToken } = get(auth);
  if (!refreshToken) return false;

  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      if (!res.ok) {
        auth.logout();
        return false;
      }

      auth.apply((await res.json()) as AuthResponse);
      return true;
    } catch {
      auth.logout();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const headers = await buildHeaders(options.headers as Record<string, string>);
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !retried && get(auth).refreshToken) {
    if (await refreshSession()) return request<T>(path, options, true);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  createVideo(data: CreateVideoData) {
    return request<{ video: Video; uploadUrl: string; uploadKey: string }>("/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  confirmUpload(videoId: string) {
    return request<void>(`/videos/${videoId}/confirm`, { method: "POST" });
  },

  getVideo(videoId: string) {
    return request<Video>(`/videos/${videoId}`);
  },
};

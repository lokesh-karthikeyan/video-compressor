import { edenTreaty } from "@elysiajs/eden";
import type { App } from "@video-compressor/api";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) throw new Error("API_INTERNAL_URL is not set");

export const eden = edenTreaty<App>(API_URL);

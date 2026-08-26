export const ANON_DAILY_LIMIT = 3;

export const ANON_MAX_SIZE = 50 * 1024 * 1024;

export const STORAGE_KEY = "video_compressions";

export const PRESETS = [
  {
    id: "github-readme",
    name: "GitHub Readme (< 10MB)",
    description: "Compress to < 10MB for GitHub README embeds",
    crf: 30,
    maxResolution: 720,
    targetSizeBytes: 10 * 1024 * 1024,
  },
];

export const CUSTOM_DEFAULTS = {
  crf: 23,
  maxResolution: 1080,
};

export const MESSAGES = {
  SIGN_IN_FOR_LARGE_FILE: "Sign in to compress videos larger than 50MB",
  DAILY_LIMIT_REACHED: "Daily limit reached (3 videos/day). Sign in for unlimited.",
  SIGN_IN_FOR_TRIM: "Sign in to trim videos",
  SIGN_IN_FOR_CROP: "Sign in to crop videos",
  SIGN_IN_FOR_EDIT: "Sign in to trim or crop videos",
} as const;

export const TOAST_DURATION = 4000;

export const MAX_VISIBLE_TOASTS = 4;

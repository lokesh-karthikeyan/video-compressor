import { readFileSync } from "node:fs";

export const getEnvOrThrowError = (name: string): string => {
  const file = process.env[`${name}_FILE`];

  if (file) {
    try {
      return readFileSync(file, "utf8").trim();
    } catch {
      throw new Error(`Failed to read secret file for ${name}: ${file}`);
    }
  }

  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);

  return value;
};

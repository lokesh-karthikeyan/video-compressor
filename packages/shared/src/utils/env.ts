export const getEnvOrThrowError = (name: string): string => {
  const value = Bun.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);

  return value;
};

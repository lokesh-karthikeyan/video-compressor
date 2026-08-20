import { t } from "elysia";

export const registerSchema = t.Object({
  email: t.String({ format: "email" }),
  name: t.String({ minLength: 1, maxLength: 100 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
});

export const loginSchema = t.Object({
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 1 }),
});

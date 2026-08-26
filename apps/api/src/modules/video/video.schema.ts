import { t } from "elysia";

export const createVideoSchema = t.Object({
  filename: t.String({ minLength: 1 }),
  fileSize: t.Number({ minimum: 1 }),
  contentType: t.String({ minLength: 1 }),
  options: t.Object({
    crf: t.Number({ minimum: 0, maximum: 51 }),
    maxResolution: t.Number({ minimum: 144, maximum: 2160 }),
    targetSizeBytes: t.Optional(t.Number({ minimum: 1 })),
    start: t.Optional(t.String()),
    end: t.Optional(t.String()),
    crop: t.Optional(
      t.Object({
        w: t.Number(),
        h: t.Number(),
        x: t.Number(),
        y: t.Number(),
      }),
    ),
  }),
});

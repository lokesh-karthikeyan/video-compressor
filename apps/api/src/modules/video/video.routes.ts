import Elysia from "elysia";
import { createVideoSchema } from "./video.schema";
import { videoHandlers } from "./video.handlers";
import { verifiedJwt } from "../../middleware";
import { authUtils } from "../auth/auth.utils";
import { type AuthUser } from "@video-compressor/shared";

export const videoRoutes = new Elysia({ prefix: "/videos" })
  .use(verifiedJwt)
  .resolve(async ({ jwtPayload }): Promise<{ user: AuthUser }> => ({
    user: await authUtils.validateAuthPayload(jwtPayload),
  }))
  .post("/", ({ user, body }) => videoHandlers.create(user.id, body), { body: createVideoSchema })
  .get("/:id", ({ user, params }) => videoHandlers.get(user.id, params.id))
  .post("/:id/confirm", ({ user, params }) => videoHandlers.confirmUpload(user.id, params.id));

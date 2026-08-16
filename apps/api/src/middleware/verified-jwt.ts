import Elysia from "elysia";
import { bearerPlugin, jwtPlugin } from "../plugins";
import { AuthUnauthorizedError } from "@video-compressor/shared";

export const verifiedJwt = new Elysia()
  .use(jwtPlugin)
  .use(bearerPlugin)
  .resolve(async ({ bearer, jwt }) => {
    if (!bearer) throw new AuthUnauthorizedError();

    const payload = await jwt.verify(bearer);
    if (!payload) throw new AuthUnauthorizedError();

    return { jwtPayload: payload };
  })
  .as("scoped");

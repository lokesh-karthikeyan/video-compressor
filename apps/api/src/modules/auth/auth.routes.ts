import Elysia from "elysia";
import { loginSchema, registerSchema } from "./auth.schema";
import { jwtPlugin } from "../../plugins";
import { authHandlers } from "./auth.handlers";
import { verifiedJwt } from "../../middleware";
import { authUtils } from "./auth.utils";
import { type AuthUser } from "@video-compressor/shared";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)

  .post("/register", ({ body, jwt }) => authHandlers.register(body, jwt.sign), {
    body: registerSchema,
  })
  .post("/login", ({ body, jwt }) => authHandlers.login(body, jwt.sign), {
    body: loginSchema,
  })

  .use(
    new Elysia()
      .use(verifiedJwt)

      .group("/me", (app) =>
        app
          .resolve(async ({ jwtPayload }): Promise<{ user: AuthUser }> => ({
            user: await authUtils.validateAuthPayload(jwtPayload),
          }))
          .get("/", ({ user }) => authHandlers.me(user)),
      )

      .group("/refresh", (app) =>
        app
          .resolve(async ({ jwtPayload }): Promise<{ id: string }> => {
            const { id } = await authUtils.validateRefreshPayload(jwtPayload);
            return { id };
          })
          .post("/", ({ id, jwt }) => authHandlers.refresh(id, jwt.sign)),
      ),
  );

import {
  AuthInvalidCredentialsError,
  AuthUserExistsError,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
} from "@video-compressor/shared";
import { userQueries } from "../../../../../packages/database/src";
import { hashPassword, verifyPassword } from "../../utils";
import { InternalServerError, NotFoundError } from "elysia";

export const authService = {
  async register(data: RegisterRequest): Promise<{ user: AuthUser }> {
    const { email } = data;
    const existingUser = await userQueries.findByEmail(email);
    if (existingUser) throw new AuthUserExistsError();

    const { name, password } = data;
    const passwordHash = await hashPassword(password);
    const user = await userQueries.create({
      name,
      email,
      passwordHash,
      createedAt: new Date(),
      updatedAt: new Date(),
    });

    if (!user) throw new InternalServerError();

    return { user: { id: user.id, name: user.name, email: user.email } };
  },

  async login(data: LoginRequest): Promise<{ user: AuthUser }> {
    const { email, password } = data;
    const user = await userQueries.findByEmail(email);
    if (!user) throw new AuthInvalidCredentialsError();

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) throw new AuthInvalidCredentialsError();

    return { user: { id: user.id, email, name: user.name } };
  },

  async findById(id: string): Promise<{ user: AuthUser }> {
    const user = await userQueries.findById(id);
    if (!user) throw new NotFoundError("User not found");

    return { user: { id: user.id, email: user.email, name: user.name } };
  },
};

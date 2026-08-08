import { eq } from "drizzle-orm";
import { db } from "../client";
import { users, type NewUser, type User } from "../schema";

export const userQueries = {
  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  },

  async findById(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  },

  async create(data: NewUser): Promise<User | undefined> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async update(id: string, data: Partial<NewUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowsAffected > 0;
  },
};

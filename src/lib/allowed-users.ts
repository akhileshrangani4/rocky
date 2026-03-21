import { getDb, schema } from "@/db";
import { and, eq } from "drizzle-orm";

export type Platform = "slack" | "discord" | "github" | "linear" | "telegram";

export async function isUserAllowed(
  platform: Platform,
  platformUserId: string,
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.allowedPlatformUser.id })
    .from(schema.allowedPlatformUser)
    .where(
      and(
        eq(schema.allowedPlatformUser.platform, platform),
        eq(schema.allowedPlatformUser.platformUserId, platformUserId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function getAllowedUsers(platform?: Platform) {
  const db = getDb();
  if (platform) {
    return db
      .select()
      .from(schema.allowedPlatformUser)
      .where(eq(schema.allowedPlatformUser.platform, platform));
  }
  return db.select().from(schema.allowedPlatformUser);
}

export async function addAllowedUser(
  platform: Platform,
  platformUserId: string,
  platformUsername?: string,
) {
  const db = getDb();
  return db
    .insert(schema.allowedPlatformUser)
    .values({ platform, platformUserId, platformUsername })
    .returning();
}

export async function removeAllowedUser(id: string) {
  const db = getDb();
  return db
    .delete(schema.allowedPlatformUser)
    .where(eq(schema.allowedPlatformUser.id, id));
}

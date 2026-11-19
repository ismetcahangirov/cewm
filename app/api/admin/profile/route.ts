import { eq } from "drizzle-orm";

import { adminRoute, readJson } from "@/lib/api/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { profileInputSchema } from "@/lib/validation/profile";

export const PATCH = adminRoute(async (request, { user }) => {
  const body = await readJson(request, profileInputSchema);
  if ("response" in body) return body.response;
  await getDb()
    .update(users)
    .set({ adminLocale: body.data.adminLocale })
    .where(eq(users.id, user.id));
  return Response.json({ adminLocale: body.data.adminLocale });
});

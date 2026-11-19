import "server-only";

import { revalidateTag } from "next/cache";

import { scheduleIndexNow } from "@/lib/seo/indexnow-server";

import type { PublicTag } from "./tags";

export function revalidatePublic(...tags: PublicTag[]): void {
  for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 });
  scheduleIndexNow();
}

import "server-only";

import { revalidateTag } from "next/cache";

import type { PublicTag } from "./tags";

export function revalidatePublic(...tags: PublicTag[]): void {
  for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 });
}

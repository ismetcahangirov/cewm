import "server-only";

import { after } from "next/server";

import { notifyIndexNow } from "./indexnow";
import { queryCorpus } from "./corpus";

export function scheduleIndexNow(): void {
  try {
    after(async () => {
      try {
        await notifyIndexNow(await queryCorpus());
      } catch {
        return;
      }
    });
  } catch {
    return;
  }
}

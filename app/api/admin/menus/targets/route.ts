import { listMenuTargets } from "@/lib/admin/menus";
import { adminRoute } from "@/lib/api/server";

export const GET = adminRoute(async () => Response.json(await listMenuTargets()));

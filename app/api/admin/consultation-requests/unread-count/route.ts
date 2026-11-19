import { countUnreadRequests } from "@/lib/admin/dashboard";
import { adminRoute } from "@/lib/api/server";

export const GET = adminRoute(async () => Response.json({ count: await countUnreadRequests() }));

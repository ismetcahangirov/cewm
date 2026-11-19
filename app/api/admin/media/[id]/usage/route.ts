import { mediaUsageItems } from "@/lib/admin/media";
import { adminRoute, readId } from "@/lib/api/server";

type Context = RouteContext<"/api/admin/media/[id]/usage">;

export const GET = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, "Fayl tapılmadı.");
  if ("response" in target) return target.response;
  return Response.json(await mediaUsageItems(target.id));
});

import { reorderFooterMenus } from "@/lib/admin/menus";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { reorderMenusSchema } from "@/lib/validation/menus";

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, reorderMenusSchema);
  if ("response" in body) return body.response;
  const result = await reorderFooterMenus(body.data.orderedIds);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("menus");
  return new Response(null, { status: 204 });
});

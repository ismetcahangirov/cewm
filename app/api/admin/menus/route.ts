import { createFooterMenu, listMenus } from "@/lib/admin/menus";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { createMenuSchema } from "@/lib/validation/menus";

export const GET = adminRoute(async () => Response.json(await listMenus()));

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, createMenuSchema);
  if ("response" in body) return body.response;
  const result = await createFooterMenu(body.data.title);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("menus");
  return Response.json(result.menu, { status: 201 });
});

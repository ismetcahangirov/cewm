import { deleteMenu, getMenuDetail, saveMenu } from "@/lib/admin/menus";
import { adminRoute, domainError, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { saveMenuSchema } from "@/lib/validation/menus";

type Context = RouteContext<"/api/admin/menus/[id]">;

const missing = "Menyu tapılmadı.";

export const GET = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const menu = await getMenuDetail(target.id);
  if (!menu) return jsonError(404, "not-found", missing);
  return Response.json(menu);
});

export const PUT = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, saveMenuSchema);
  if ("response" in body) return body.response;
  const result = await saveMenu(target.id, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("menus");
  return Response.json(result.menu);
});

export const DELETE = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const result = await deleteMenu(target.id);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("menus");
  return new Response(null, { status: 204 });
});

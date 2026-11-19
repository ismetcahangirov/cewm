import { deletePage, getPage, savePage } from "@/lib/admin/pages";
import { adminRoute, domainError, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { pageInputSchema } from "@/lib/validation/pages";

type Context = RouteContext<"/api/admin/pages/[id]">;

const missing = "Səhifə tapılmadı.";

export const GET = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const page = await getPage(target.id);
  if (!page) return jsonError(404, "not-found", missing);
  return Response.json(page);
});

export const PUT = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, pageInputSchema);
  if ("response" in body) return body.response;
  const result = await savePage(target.id, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content", "menus");
  return Response.json(result);
});

export const DELETE = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const result = await deletePage(target.id);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content", "menus");
  return new Response(null, { status: 204 });
});

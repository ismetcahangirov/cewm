import { listPages, savePage } from "@/lib/admin/pages";
import { adminRoute, domainError, readJson, readQuery } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { pageInputSchema, pageListQuery } from "@/lib/validation/pages";

export const GET = adminRoute(async (request) => {
  const query = readQuery(request, pageListQuery);
  if ("response" in query) return query.response;
  return Response.json(await listPages(query.data));
});

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, pageInputSchema);
  if ("response" in body) return body.response;
  const result = await savePage(null, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content", "menus");
  return Response.json(result, { status: 201 });
});

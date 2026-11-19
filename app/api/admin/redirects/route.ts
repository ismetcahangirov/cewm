import { listRedirects, saveRedirect } from "@/lib/admin/redirects";
import { adminRoute, domainError, readJson, readQuery } from "@/lib/api/server";
import { invalidateLegacyRedirects } from "@/lib/redirects/legacy";
import { redirectInputSchema, redirectListQuery } from "@/lib/validation/redirects";

export const GET = adminRoute(async (request) => {
  const query = readQuery(request, redirectListQuery);
  if ("response" in query) return query.response;
  return Response.json(await listRedirects(query.data));
});

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, redirectInputSchema);
  if ("response" in body) return body.response;
  const result = await saveRedirect(null, body.data);
  if ("error" in result) return domainError(result.error);
  invalidateLegacyRedirects();
  return Response.json(result, { status: 201 });
});

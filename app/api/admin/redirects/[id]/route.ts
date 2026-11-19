import { deleteRedirect, saveRedirect } from "@/lib/admin/redirects";
import { adminRoute, domainError, jsonError, readId, readJson } from "@/lib/api/server";
import { invalidateLegacyRedirects } from "@/lib/redirects/legacy";
import { redirectInputSchema } from "@/lib/validation/redirects";

type Context = RouteContext<"/api/admin/redirects/[id]">;

const missing = "Yönləndirmə tapılmadı.";

export const PUT = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, redirectInputSchema);
  if ("response" in body) return body.response;
  const result = await saveRedirect(target.id, body.data);
  if ("error" in result) return domainError(result.error);
  invalidateLegacyRedirects();
  return Response.json(result);
});

export const DELETE = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  if (!(await deleteRedirect(target.id))) return jsonError(404, "not-found", missing);
  invalidateLegacyRedirects();
  return new Response(null, { status: 204 });
});

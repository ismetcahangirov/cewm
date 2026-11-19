import { updateClientLogo } from "@/lib/admin/client-logos";
import { deleteRow, setRowActive } from "@/lib/admin/ordering";
import { adminRoute, domainError, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { clientLogos } from "@/lib/db/schema";
import { clientLogoInputSchema, toggleActiveSchema } from "@/lib/validation/client-logos";

type Context = RouteContext<"/api/admin/client-logos/[id]">;

const missing = "Loqo tapılmadı.";

export const PUT = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, clientLogoInputSchema);
  if ("response" in body) return body.response;
  const result = await updateClientLogo(target.id, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return Response.json(result);
});

export const PATCH = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, toggleActiveSchema);
  if ("response" in body) return body.response;
  if (!(await setRowActive(clientLogos, target.id, body.data.isActive))) {
    return jsonError(404, "not-found", missing);
  }
  revalidatePublic("content");
  return new Response(null, { status: 204 });
});

export const DELETE = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  if (!(await deleteRow(clientLogos, target.id))) return jsonError(404, "not-found", missing);
  revalidatePublic("content");
  return new Response(null, { status: 204 });
});

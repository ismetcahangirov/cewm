import { updateBrand } from "@/lib/admin/brands";
import { deleteRow, setRowActive } from "@/lib/admin/ordering";
import { adminRoute, domainError, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { brands } from "@/lib/db/schema";
import { brandInputSchema } from "@/lib/validation/brands";
import { toggleActiveSchema } from "@/lib/validation/client-logos";

type Context = RouteContext<"/api/admin/brands/[id]">;

const missing = "Brend tapılmadı.";

export const PUT = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, brandInputSchema);
  if ("response" in body) return body.response;
  const result = await updateBrand(target.id, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("catalog");
  return Response.json(result);
});

export const PATCH = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, toggleActiveSchema);
  if ("response" in body) return body.response;
  if (!(await setRowActive(brands, target.id, body.data.isActive))) {
    return jsonError(404, "not-found", missing);
  }
  revalidatePublic("catalog");
  return new Response(null, { status: 204 });
});

export const DELETE = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  if (!(await deleteRow(brands, target.id))) return jsonError(404, "not-found", missing);
  revalidatePublic("catalog");
  return new Response(null, { status: 204 });
});

import { bulkUpdateProducts, getProduct, saveProduct } from "@/lib/admin/products";
import { adminRoute, domainError, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { productInputSchema } from "@/lib/validation/products";

type Context = RouteContext<"/api/admin/products/[id]">;

const missing = "Məhsul tapılmadı.";

export const GET = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const product = await getProduct(target.id);
  if (!product) return jsonError(404, "not-found", missing);
  return Response.json(product);
});

export const PUT = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, productInputSchema);
  if ("response" in body) return body.response;
  const result = await saveProduct(target.id, body.data);
  if ("error" in result) {
    return domainError(result.error);
  }
  revalidatePublic("catalog");
  return Response.json(result);
});

export const DELETE = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const result = await bulkUpdateProducts({ action: "trash", ids: [target.id] });
  if (!result.updated) return jsonError(404, "not-found", missing);
  revalidatePublic("catalog");
  return Response.json(result);
});

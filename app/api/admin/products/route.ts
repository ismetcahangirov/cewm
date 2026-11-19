import { listProducts, saveProduct } from "@/lib/admin/products";
import { adminRoute, domainError, readJson, readQuery } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { productInputSchema, productListQuery } from "@/lib/validation/products";

export const GET = adminRoute(async (request) => {
  const query = readQuery(request, productListQuery);
  if ("response" in query) return query.response;
  return Response.json(await listProducts(query.data));
});

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, productInputSchema);
  if ("response" in body) return body.response;
  const result = await saveProduct(null, body.data);
  if ("error" in result) {
    return domainError(result.error);
  }
  revalidatePublic("catalog");
  return Response.json(result, { status: 201 });
});

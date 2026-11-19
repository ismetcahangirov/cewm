import { bulkUpdateProducts } from "@/lib/admin/products";
import { adminRoute, jsonError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { bulkProductsSchema } from "@/lib/validation/products";

export const POST = adminRoute(async (request, { user }) => {
  const body = await readJson(request, bulkProductsSchema);
  if ("response" in body) return body.response;
  if (body.data.action === "purge" && user.role !== "owner") {
    return jsonError(403, "forbidden", "Həmişəlik silmək yalnız sahibə icazəlidir.");
  }
  const result = await bulkUpdateProducts(body.data);
  if (result.updated) revalidatePublic("catalog");
  return Response.json(result);
});

import { reorderCategories } from "@/lib/admin/categories";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { reorderCategoriesSchema } from "@/lib/validation/categories";

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, reorderCategoriesSchema);
  if ("response" in body) return body.response;
  const result = await reorderCategories(body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("catalog", "menus");
  return new Response(null, { status: 204 });
});

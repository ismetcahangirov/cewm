import { createCategory, listCategoryNodes } from "@/lib/admin/categories";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { categoryInputSchema } from "@/lib/validation/categories";

export const GET = adminRoute(async () => Response.json(await listCategoryNodes()));

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, categoryInputSchema);
  if ("response" in body) return body.response;
  const result = await createCategory(body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("catalog", "menus");
  return Response.json(result, { status: 201 });
});

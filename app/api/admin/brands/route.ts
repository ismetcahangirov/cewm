import { createBrand, listBrands } from "@/lib/admin/brands";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { brandInputSchema } from "@/lib/validation/brands";

export const GET = adminRoute(async () => Response.json(await listBrands()));

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, brandInputSchema);
  if ("response" in body) return body.response;
  const result = await createBrand(body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("catalog");
  return Response.json(result, { status: 201 });
});

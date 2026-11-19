import { getAdminHomeSections, saveHomeSections } from "@/lib/admin/home-sections";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { homeSectionsInputSchema } from "@/lib/validation/home-sections";

export const GET = adminRoute(async () => Response.json(await getAdminHomeSections()));

export const PUT = adminRoute(async (request) => {
  const body = await readJson(request, homeSectionsInputSchema);
  if ("response" in body) return body.response;
  const result = await saveHomeSections(body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("settings", "catalog");
  return Response.json(result.homeSections);
});

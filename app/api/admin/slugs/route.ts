import { checkSlug } from "@/lib/admin/slugs";
import { adminRoute, readQuery } from "@/lib/api/server";
import { slugCheckQuery } from "@/lib/validation/slugs";

export const GET = adminRoute(async (request) => {
  const query = readQuery(request, slugCheckQuery);
  if ("response" in query) return query.response;
  const { entity, locale, slug, excludeId } = query.data;
  return Response.json(await checkSlug(entity, locale, slug, excludeId || undefined));
});

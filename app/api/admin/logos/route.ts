import { createLogo, listLogos } from "@/lib/admin/logos";
import { adminRoute, domainError, readJson, readQuery } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { logoInputSchema, logoListQuery } from "@/lib/validation/logos";

export const GET = adminRoute(async (request) => {
  const query = readQuery(request, logoListQuery);
  if ("response" in query) return query.response;
  return Response.json(await listLogos(query.data.group));
});

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, logoInputSchema);
  if ("response" in body) return body.response;
  const result = await createLogo(body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return Response.json(result, { status: 201 });
});

import { createClientLogo, listClientLogos } from "@/lib/admin/client-logos";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { clientLogoInputSchema } from "@/lib/validation/client-logos";

export const GET = adminRoute(async () => Response.json(await listClientLogos()));

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, clientLogoInputSchema);
  if ("response" in body) return body.response;
  const result = await createClientLogo(body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return Response.json(result, { status: 201 });
});

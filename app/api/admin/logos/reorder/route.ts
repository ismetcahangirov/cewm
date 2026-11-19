import { reorderLogos } from "@/lib/admin/logos";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { reorderLogosSchema } from "@/lib/validation/logos";

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, reorderLogosSchema);
  if ("response" in body) return body.response;
  const result = await reorderLogos(body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return new Response(null, { status: 204 });
});

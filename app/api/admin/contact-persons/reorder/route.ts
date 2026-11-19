import { reorderRows } from "@/lib/admin/ordering";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { contactPersons } from "@/lib/db/schema";
import { reorderSchema } from "@/lib/validation/client-logos";

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, reorderSchema);
  if ("response" in body) return body.response;
  const result = await reorderRows(contactPersons, body.data.orderedIds);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return new Response(null, { status: 204 });
});

import { reorderTeamMembers } from "@/lib/admin/team";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { reorderTeamSchema } from "@/lib/validation/team";

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, reorderTeamSchema);
  if ("response" in body) return body.response;
  const result = await reorderTeamMembers(body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return new Response(null, { status: 204 });
});

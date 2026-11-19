import { createTeamMember, listTeamMembers } from "@/lib/admin/team";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { teamMemberInputSchema } from "@/lib/validation/team";

export const GET = adminRoute(async () => Response.json(await listTeamMembers()));

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, teamMemberInputSchema);
  if ("response" in body) return body.response;
  const result = await createTeamMember(body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return Response.json(result, { status: 201 });
});

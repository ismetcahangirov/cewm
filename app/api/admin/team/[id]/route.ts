import { deleteTeamMember, setTeamMemberActive, updateTeamMember } from "@/lib/admin/team";
import { adminRoute, domainError, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { teamMemberInputSchema, toggleTeamMemberSchema } from "@/lib/validation/team";

type Context = RouteContext<"/api/admin/team/[id]">;

const missing = "İşçi tapılmadı.";

export const PUT = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, teamMemberInputSchema);
  if ("response" in body) return body.response;
  const result = await updateTeamMember(target.id, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return Response.json(result);
});

export const PATCH = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, toggleTeamMemberSchema);
  if ("response" in body) return body.response;
  if (!(await setTeamMemberActive(target.id, body.data.isActive))) {
    return jsonError(404, "not-found", missing);
  }
  revalidatePublic("content");
  return new Response(null, { status: 204 });
});

export const DELETE = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  if (!(await deleteTeamMember(target.id))) return jsonError(404, "not-found", missing);
  revalidatePublic("content");
  return new Response(null, { status: 204 });
});

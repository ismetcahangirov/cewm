import { findUser, findUserByEmail, listUsers, toUserDto } from "@/lib/admin/users";
import { adminRoute, jsonError, readJson, readQuery } from "@/lib/api/server";
import { getAuth, resetPasswordRedirect } from "@/lib/auth";
import { inviteUserSchema, userListQuery } from "@/lib/validation/users";

export const GET = adminRoute(
  async (request) => {
    const query = readQuery(request, userListQuery);
    if ("response" in query) return query.response;
    return Response.json(await listUsers(query.data));
  },
  { role: "owner" },
);

export const POST = adminRoute(
  async (request) => {
    const body = await readJson(request, inviteUserSchema);
    if ("response" in body) return body.response;
    const { name, email, role } = body.data;

    if (await findUserByEmail(email)) {
      return jsonError(409, "conflict", "Bu e-poçt ilə istifadəçi artıq var.");
    }

    const auth = getAuth();
    const created = await auth.api.createUser({
      headers: request.headers,
      body: { name, email, role },
    });
    await auth.api.requestPasswordReset({
      headers: request.headers,
      body: { email, redirectTo: resetPasswordRedirect },
    });

    const row = await findUser(created.user.id);
    if (!row) return jsonError(404, "not-found", "İstifadəçi tapılmadı.");
    return Response.json(toUserDto(row), { status: 201 });
  },
  { role: "owner" },
);

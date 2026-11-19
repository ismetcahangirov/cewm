import { findUser, toUserDto } from "@/lib/admin/users";
import { adminRoute, jsonError, readJson } from "@/lib/api/server";
import { getAuth } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validation/users";

export const PATCH = adminRoute<RouteContext<"/api/admin/users/[id]">>(
  async (request, { params, user }) => {
    const { id } = await params;
    const body = await readJson(request, updateUserSchema);
    if ("response" in body) return body.response;

    if (id === user.id) {
      return jsonError(409, "conflict", "Öz rolunuzu və statusunuzu dəyişə bilməzsiniz.");
    }
    const target = await findUser(id);
    if (!target) return jsonError(404, "not-found", "İstifadəçi tapılmadı.");

    const auth = getAuth();
    const { role, active } = body.data;
    if (role !== undefined && role !== target.role) {
      await auth.api.setRole({ headers: request.headers, body: { userId: id, role } });
    }
    if (active === false && !target.banned) {
      await auth.api.banUser({ headers: request.headers, body: { userId: id } });
    }
    if (active === true && target.banned) {
      await auth.api.unbanUser({ headers: request.headers, body: { userId: id } });
    }

    const updated = await findUser(id);
    if (!updated) return jsonError(404, "not-found", "İstifadəçi tapılmadı.");
    return Response.json(toUserDto(updated));
  },
  { role: "owner" },
);

import { findUser } from "@/lib/admin/users";
import { adminRoute, jsonError } from "@/lib/api/server";
import { getAuth, resetPasswordRedirect } from "@/lib/auth";

export const POST = adminRoute<RouteContext<"/api/admin/users/[id]/invite">>(
  async (request, { params }) => {
    const { id } = await params;
    const target = await findUser(id);
    if (!target) return jsonError(404, "not-found", "İstifadəçi tapılmadı.");
    if (target.banned) return jsonError(409, "conflict", "Deaktiv istifadəçiyə dəvət göndərilmir.");

    await getAuth().api.requestPasswordReset({
      headers: request.headers,
      body: { email: target.email, redirectTo: resetPasswordRedirect },
    });
    return new Response(null, { status: 204 });
  },
  { role: "owner" },
);

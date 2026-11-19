import {
  deleteConsultationRequest,
  getConsultationRequest,
  updateConsultationRequest,
} from "@/lib/admin/consultation-requests";
import { adminRoute, jsonError, readId, readJson } from "@/lib/api/server";
import { updateConsultationRequestSchema } from "@/lib/validation/consultation-requests";

type Context = RouteContext<"/api/admin/consultation-requests/[id]">;

const missing = "Müraciət tapılmadı.";

export const GET = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const request = await getConsultationRequest(target.id, { markSeen: true });
  if (!request) return jsonError(404, "not-found", missing);
  return Response.json(request);
});

export const PATCH = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, updateConsultationRequestSchema);
  if ("response" in body) return body.response;
  const updated = await updateConsultationRequest(target.id, body.data);
  if (!updated) return jsonError(404, "not-found", missing);
  return Response.json(updated);
});

export const DELETE = adminRoute<Context>(
  async (_request, { params }) => {
    const target = await readId(params, missing);
    if ("response" in target) return target.response;
    if (!(await deleteConsultationRequest(target.id))) return jsonError(404, "not-found", missing);
    return new Response(null, { status: 204 });
  },
  { role: "owner" },
);

import {
  deleteQuoteRequest,
  getQuoteRequest,
  updateQuoteRequest,
} from "@/lib/admin/quote-requests";
import { adminRoute, jsonError, readId, readJson } from "@/lib/api/server";
import { updateQuoteRequestSchema } from "@/lib/validation/quote-requests";

type Context = RouteContext<"/api/admin/quote-requests/[id]">;

const missing = "Müraciət tapılmadı.";

export const GET = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const request = await getQuoteRequest(target.id, { markSeen: true });
  if (!request) return jsonError(404, "not-found", missing);
  return Response.json(request);
});

export const PATCH = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, updateQuoteRequestSchema);
  if ("response" in body) return body.response;
  const updated = await updateQuoteRequest(target.id, body.data);
  if (!updated) return jsonError(404, "not-found", missing);
  return Response.json(updated);
});

export const DELETE = adminRoute<Context>(
  async (_request, { params }) => {
    const target = await readId(params, missing);
    if ("response" in target) return target.response;
    if (!(await deleteQuoteRequest(target.id))) return jsonError(404, "not-found", missing);
    return new Response(null, { status: 204 });
  },
  { role: "owner" },
);

import { listConsultationRequests } from "@/lib/admin/consultation-requests";
import { adminRoute, readQuery } from "@/lib/api/server";
import { consultationRequestListQuery } from "@/lib/validation/consultation-requests";

export const GET = adminRoute(async (request) => {
  const query = readQuery(request, consultationRequestListQuery);
  if ("response" in query) return query.response;
  return Response.json(await listConsultationRequests(query.data));
});

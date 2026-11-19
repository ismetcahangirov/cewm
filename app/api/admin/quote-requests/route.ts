import { listQuoteRequests } from "@/lib/admin/quote-requests";
import { adminRoute, readQuery } from "@/lib/api/server";
import { quoteRequestListQuery } from "@/lib/validation/quote-requests";

export const GET = adminRoute(async (request) => {
  const query = readQuery(request, quoteRequestListQuery);
  if ("response" in query) return query.response;
  return Response.json(await listQuoteRequests(query.data));
});

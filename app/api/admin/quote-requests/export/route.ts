import { exportFileName, exportQuoteRequestsCsv } from "@/lib/admin/quote-requests";
import { adminRoute, readQuery } from "@/lib/api/server";
import { quoteRequestExportQuery } from "@/lib/validation/quote-requests";

export const GET = adminRoute(async (request) => {
  const query = readQuery(request, quoteRequestExportQuery);
  if ("response" in query) return query.response;
  const csv = await exportQuoteRequestsCsv(query.data);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName()}"`,
      "Cache-Control": "no-store",
    },
  });
});

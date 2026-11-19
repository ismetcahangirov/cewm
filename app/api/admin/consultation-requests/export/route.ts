import { exportFileName, exportConsultationRequestsCsv } from "@/lib/admin/consultation-requests";
import { adminRoute, readQuery } from "@/lib/api/server";
import { consultationRequestExportQuery } from "@/lib/validation/consultation-requests";

export const GET = adminRoute(async (request) => {
  const query = readQuery(request, consultationRequestExportQuery);
  if ("response" in query) return query.response;
  const csv = await exportConsultationRequestsCsv(query.data);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName()}"`,
      "Cache-Control": "no-store",
    },
  });
});

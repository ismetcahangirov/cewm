import { createUploadTicket } from "@/lib/admin/media";
import { adminRoute, readJson } from "@/lib/api/server";
import { uploadRequestSchema } from "@/lib/validation/media";

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, uploadRequestSchema);
  if ("response" in body) return body.response;
  return Response.json(await createUploadTicket(body.data), { status: 201 });
});

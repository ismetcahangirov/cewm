import { completeUpload, listMedia } from "@/lib/admin/media";
import { adminRoute, jsonError, readJson, readQuery } from "@/lib/api/server";
import { completeUploadSchema, mediaListQuery } from "@/lib/validation/media";

export const GET = adminRoute(async (request) => {
  const query = readQuery(request, mediaListQuery);
  if ("response" in query) return query.response;
  return Response.json(await listMedia(query.data));
});

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, completeUploadSchema);
  if ("response" in body) return body.response;
  const result = await completeUpload(body.data.key, body.data.alt);
  if ("media" in result) {
    return Response.json(result.media, { status: result.status === "created" ? 201 : 200 });
  }
  return result.status === "missing"
    ? jsonError(404, "not-found", result.message)
    : jsonError(400, "invalid", result.message);
});

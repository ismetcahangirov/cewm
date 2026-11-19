import { replaceMedia } from "@/lib/admin/media";
import { adminRoute, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { replaceMediaSchema } from "@/lib/validation/media";

type Context = RouteContext<"/api/admin/media/[id]/replace">;

export const POST = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, "Fayl tapılmadı.");
  if ("response" in target) return target.response;
  const body = await readJson(request, replaceMediaSchema);
  if ("response" in body) return body.response;
  const result = await replaceMedia(target.id, body.data.key);
  if (result.status === "replaced") {
    revalidatePublic("catalog", "content", "settings");
    return Response.json(result.media);
  }
  if (result.status === "not-found" || result.status === "missing") {
    return jsonError(404, "not-found", result.message);
  }
  return jsonError(
    result.status === "duplicate" ? 409 : 400,
    result.status === "duplicate" ? "conflict" : "invalid",
    result.message,
  );
});

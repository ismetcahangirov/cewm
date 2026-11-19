import { deleteMedia, updateMediaText } from "@/lib/admin/media";
import { adminRoute, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { updateMediaSchema } from "@/lib/validation/media";

type Context = RouteContext<"/api/admin/media/[id]">;

const missing = "Fayl tapılmadı.";

export const PATCH = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, updateMediaSchema);
  if ("response" in body) return body.response;
  const updated = await updateMediaText(target.id, body.data);
  if (!updated) return jsonError(404, "not-found", missing);
  revalidatePublic("catalog");
  return Response.json(updated);
});

export const DELETE = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const result = await deleteMedia(target.id);
  if (result === "missing") return jsonError(404, "not-found", missing);
  if (result === "in-use") {
    return jsonError(
      409,
      "conflict",
      "Fayl istifadə olunur. Əvvəlcə onu istifadə edən yerlərdən çıxarın.",
    );
  }
  return new Response(null, { status: 204 });
});

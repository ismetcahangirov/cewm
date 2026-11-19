import { deleteHeroFilm, saveHeroFilm } from "@/lib/admin/hero-films";
import { adminRoute, domainError, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { heroFilmInputSchema } from "@/lib/validation/hero-films";

type Context = RouteContext<"/api/admin/hero-films/[id]">;

const missing = "Film tapılmadı.";

export const PUT = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, heroFilmInputSchema);
  if ("response" in body) return body.response;
  const result = await saveHeroFilm(target.id, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("settings");
  return Response.json(result);
});

export const DELETE = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  if (!(await deleteHeroFilm(target.id))) return jsonError(404, "not-found", missing);
  revalidatePublic("settings");
  return new Response(null, { status: 204 });
});

import { listHeroFilms, saveHeroFilm } from "@/lib/admin/hero-films";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { heroFilmInputSchema } from "@/lib/validation/hero-films";

export const GET = adminRoute(async () => Response.json(await listHeroFilms()));

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, heroFilmInputSchema);
  if ("response" in body) return body.response;
  const result = await saveHeroFilm(null, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("settings");
  return Response.json(result, { status: 201 });
});

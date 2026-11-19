import { getSiteTexts, saveSiteTexts } from "@/lib/admin/site-texts";
import { adminRoute, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { siteTextsInputSchema } from "@/lib/validation/site-texts";

export const GET = adminRoute(async () => Response.json(await getSiteTexts()), {
  role: "owner",
});

export const PUT = adminRoute(
  async (request) => {
    const body = await readJson(request, siteTextsInputSchema);
    if ("response" in body) return body.response;
    const saved = await saveSiteTexts(body.data.texts);
    revalidatePublic("settings");
    return Response.json(saved);
  },
  { role: "owner" },
);

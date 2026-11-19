import { getAdminSettings, saveSettings } from "@/lib/admin/settings";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { settingsInputSchema } from "@/lib/validation/settings";

export const GET = adminRoute(async () => Response.json(await getAdminSettings()));

export const PUT = adminRoute(async (request) => {
  const body = await readJson(request, settingsInputSchema);
  if ("response" in body) return body.response;
  const result = await saveSettings(body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("settings");
  return Response.json(result.settings);
});

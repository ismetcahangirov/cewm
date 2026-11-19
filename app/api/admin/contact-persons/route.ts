import { createContactPerson, listContactPersons } from "@/lib/admin/contact-persons";
import { adminRoute, domainError, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { contactPersonInputSchema } from "@/lib/validation/contact-persons";

export const GET = adminRoute(async () => Response.json(await listContactPersons()));

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, contactPersonInputSchema);
  if ("response" in body) return body.response;
  const result = await createContactPerson(body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return Response.json(result, { status: 201 });
});

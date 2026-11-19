import { updateContactPerson } from "@/lib/admin/contact-persons";
import { deleteRow, setRowActive } from "@/lib/admin/ordering";
import { adminRoute, domainError, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { contactPersons } from "@/lib/db/schema";
import { toggleActiveSchema } from "@/lib/validation/client-logos";
import { contactPersonInputSchema } from "@/lib/validation/contact-persons";

type Context = RouteContext<"/api/admin/contact-persons/[id]">;

const missing = "Əlaqə şəxsi tapılmadı.";

export const PUT = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, contactPersonInputSchema);
  if ("response" in body) return body.response;
  const result = await updateContactPerson(target.id, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return Response.json(result);
});

export const PATCH = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, toggleActiveSchema);
  if ("response" in body) return body.response;
  if (!(await setRowActive(contactPersons, target.id, body.data.isActive))) {
    return jsonError(404, "not-found", missing);
  }
  revalidatePublic("content");
  return new Response(null, { status: 204 });
});

export const DELETE = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  if (!(await deleteRow(contactPersons, target.id))) return jsonError(404, "not-found", missing);
  revalidatePublic("content");
  return new Response(null, { status: 204 });
});

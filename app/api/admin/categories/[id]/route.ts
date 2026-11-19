import {
  deleteCategory,
  getCategory,
  setCategoryActive,
  updateCategory,
} from "@/lib/admin/categories";
import { adminRoute, domainError, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import {
  categoryInputSchema,
  deleteCategorySchema,
  toggleCategorySchema,
} from "@/lib/validation/categories";

type Context = RouteContext<"/api/admin/categories/[id]">;

const missing = "Kateqoriya tapılmadı.";

export const GET = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const category = await getCategory(target.id);
  if (!category) return jsonError(404, "not-found", missing);
  return Response.json(category);
});

export const PUT = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, categoryInputSchema);
  if ("response" in body) return body.response;
  const result = await updateCategory(target.id, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("catalog", "menus");
  return Response.json(result);
});

export const PATCH = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, toggleCategorySchema);
  if ("response" in body) return body.response;
  if (!(await setCategoryActive(target.id, body.data.isActive))) {
    return jsonError(404, "not-found", missing);
  }
  revalidatePublic("catalog", "menus");
  return new Response(null, { status: 204 });
});

export const DELETE = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, deleteCategorySchema);
  if ("response" in body) return body.response;
  const result = await deleteCategory(target.id, body.data.moveProductsTo);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("catalog", "menus");
  return new Response(null, { status: 204 });
});

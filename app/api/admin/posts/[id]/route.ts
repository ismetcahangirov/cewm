import { deletePost, getPost, savePost } from "@/lib/admin/posts";
import { adminRoute, domainError, jsonError, readId, readJson } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { postInputSchema } from "@/lib/validation/posts";

type Context = RouteContext<"/api/admin/posts/[id]">;

const missing = "Yazı tapılmadı.";

export const GET = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const post = await getPost(target.id);
  if (!post) return jsonError(404, "not-found", missing);
  return Response.json(post);
});

export const PUT = adminRoute<Context>(async (request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  const body = await readJson(request, postInputSchema);
  if ("response" in body) return body.response;
  const result = await savePost(target.id, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return Response.json(result);
});

export const DELETE = adminRoute<Context>(async (_request, { params }) => {
  const target = await readId(params, missing);
  if ("response" in target) return target.response;
  if (!(await deletePost(target.id))) return jsonError(404, "not-found", missing);
  revalidatePublic("content");
  return new Response(null, { status: 204 });
});

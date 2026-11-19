import { listPosts, savePost } from "@/lib/admin/posts";
import { adminRoute, domainError, readJson, readQuery } from "@/lib/api/server";
import { revalidatePublic } from "@/lib/cache/revalidate";
import { postInputSchema, postListQuery } from "@/lib/validation/posts";

export const GET = adminRoute(async (request) => {
  const query = readQuery(request, postListQuery);
  if ("response" in query) return query.response;
  return Response.json(await listPosts(query.data));
});

export const POST = adminRoute(async (request) => {
  const body = await readJson(request, postInputSchema);
  if ("response" in body) return body.response;
  const result = await savePost(null, body.data);
  if ("error" in result) return domainError(result.error);
  revalidatePublic("content");
  return Response.json(result, { status: 201 });
});

import { markdownResponse } from "@/lib/seo/responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/md/[locale]/[[...path]]">,
): Promise<Response> {
  const { locale, path } = await params;
  return markdownResponse(locale, path ?? []);
}

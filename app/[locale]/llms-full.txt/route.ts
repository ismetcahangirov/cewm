import { prefixedLlmsResponse } from "@/lib/seo/responses";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/[locale]/llms-full.txt">,
): Promise<Response> {
  return prefixedLlmsResponse((await params).locale, true);
}

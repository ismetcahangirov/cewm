import { llmsResponse } from "@/lib/seo/responses";

export async function GET(): Promise<Response> {
  return llmsResponse("az", true);
}

import { connection } from "next/server";

export async function GET() {
  await connection();
  return Response.json(
    { status: "ok", uptime: Math.round(process.uptime()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { jsonError, validationError } from "@/lib/api/server";
import { clientIp, submitConsultationRequest } from "@/lib/consultation-requests/submit";
import {
  consultationHoneypotField,
  consultationSubmissionSchema,
} from "@/lib/validation/consultation-requests";

function honeypotFilled(body: unknown): boolean {
  if (typeof body !== "object" || body === null || !(consultationHoneypotField in body))
    return false;
  const value: unknown = (body as Record<string, unknown>)[consultationHoneypotField];
  if (value === null || value === undefined) return false;
  return typeof value !== "string" || value.trim() !== "";
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid", "Sorğunun gövdəsi JSON deyil.");
  }
  if (honeypotFilled(body)) return Response.json({ id: randomUUID() }, { status: 201 });

  const parsed = consultationSubmissionSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);

  const result = await submitConsultationRequest(parsed.data, clientIp(request.headers));
  if (result.status === "rate-limited") {
    return jsonError(
      429,
      "too-many-requests",
      "Son bir saatda bu ünvandan çox müraciət göndərilib. Bir az sonra yenidən cəhd edin və ya bizə zəng edin.",
    );
  }
  return Response.json({ id: result.id }, { status: 201 });
}

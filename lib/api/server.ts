import "server-only";

import type { NextRequest } from "next/server";
import { z } from "zod";

import type { UserRole } from "@/lib/auth/roles";
import { sessionUserFromHeaders, type AdminUser } from "@/lib/auth/session";

import type { ApiError } from "./types";

export function jsonError(status: number, error: ApiError["error"], message: string): Response {
  return Response.json({ error, message } satisfies ApiError, { status });
}

export function validationError(issues: z.core.$ZodIssue[]): Response {
  return Response.json(
    {
      error: "invalid",
      message: "Məlumatlar düzgün deyil.",
      fields: Object.fromEntries(issues.map((issue) => [issue.path.join("."), issue.message])),
    } satisfies ApiError,
    { status: 400 },
  );
}

type AdminHandler<Context> = (
  request: NextRequest,
  context: Context & { user: AdminUser },
) => Promise<Response>;

export function adminRoute<Context>(
  handler: AdminHandler<Context>,
  options: { role?: UserRole } = {},
): (request: NextRequest, context: Context) => Promise<Response> {
  return async (request, context) => {
    const user = await sessionUserFromHeaders(request.headers);
    if (!user) return jsonError(401, "unauthorized", "Daxil olmaq lazımdır.");
    if (options.role && user.role !== options.role) {
      return jsonError(403, "forbidden", "Bu əməliyyat üçün icazəniz yoxdur.");
    }
    return handler(request, { ...context, user });
  };
}

export async function readJson<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<{ data: z.infer<Schema> } | { response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: jsonError(400, "invalid", "Sorğunun gövdəsi JSON deyil.") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: validationError(parsed.error.issues) };
  return { data: parsed.data };
}

export function readQuery<Schema extends z.ZodType>(
  request: NextRequest,
  schema: Schema,
): { data: z.infer<Schema> } | { response: Response } {
  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return { response: validationError(parsed.error.issues) };
  return { data: parsed.data };
}

const idSchema = z.uuid();

export async function readId(
  params: Promise<{ id: string }>,
  notFound: string,
): Promise<{ id: string } | { response: Response }> {
  const { id } = await params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { response: jsonError(404, "not-found", notFound) };
  return { id: parsed.data };
}

export type DomainError = {
  status: 400 | 403 | 404 | 409;
  message: string;
  fields?: Record<string, string>;
};

const domainErrorCodes = {
  400: "invalid",
  403: "forbidden",
  404: "not-found",
  409: "conflict",
} as const satisfies Record<DomainError["status"], ApiError["error"]>;

export function domainError({ status, message, fields }: DomainError): Response {
  return Response.json({ error: domainErrorCodes[status], message, fields } satisfies ApiError, {
    status,
  });
}

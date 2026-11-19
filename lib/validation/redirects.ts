import { z } from "zod";

import "./locale";

import { splitTarget, tryNormalizeLegacyPath } from "@/lib/legacy-redirects";

import { listQuerySchema, type ListArgs } from "./list";

export const redirectStatusCodes = [301, 302, 307, 308] as const;

export type RedirectStatusCode = (typeof redirectStatusCodes)[number];

export const redirectStatusLabels: Record<RedirectStatusCode, string> = {
  301: "301 · daimi (tövsiyə olunur)",
  302: "302 · müvəqqəti",
  307: "307 · müvəqqəti, metod saxlanılır",
  308: "308 · daimi, metod saxlanılır",
};

export const reservedRedirectPrefixes = ["/admin", "/api", "/_next", "/media"] as const;

export const redirectKinds = ["all", "pages", "files"] as const;

export type RedirectKind = (typeof redirectKinds)[number];

export const uploadsPrefix = "/wp-content/";

export const redirectSortFields = ["fromPath", "toPath", "statusCode", "createdAt"] as const;

export type RedirectSortField = (typeof redirectSortFields)[number];

export const redirectListQuery = listQuerySchema(redirectSortFields).extend({
  kind: z.enum(redirectKinds).optional().default("all"),
});

export type RedirectListArgs = ListArgs<RedirectSortField> & { kind: RedirectKind };

const maxLength = 2000;

const unsafeCharacters = /[\s\p{Cc}\\]/u;

function isReserved(path: string): boolean {
  return reservedRedirectPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

const fromPathSchema = z
  .string("Köhnə ünvanı yazın.")
  .trim()
  .min(1, "Köhnə ünvanı yazın.")
  .max(maxLength, `Ən çox ${maxLength} simvol ola bilər.`)
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Ünvan «/» ilə başlamalıdır.",
  )
  .transform((value, context) => {
    const path = tryNormalizeLegacyPath(value);
    if (path === null || unsafeCharacters.test(path)) {
      context.addIssue({ code: "custom", message: "Ünvan düzgün deyil." });
      return z.NEVER;
    }
    if (path === "/") {
      context.addIssue({ code: "custom", message: "Ana səhifəni yönləndirmək olmaz." });
      return z.NEVER;
    }
    if (isReserved(path)) {
      context.addIssue({ code: "custom", message: "Bu ünvan yönləndirilə bilməz." });
      return z.NEVER;
    }
    return path;
  });

const toPathSchema = z
  .string("Yeni ünvanı yazın.")
  .trim()
  .min(1, "Yeni ünvanı yazın.")
  .max(maxLength, `Ən çox ${maxLength} simvol ola bilər.`)
  .refine(
    (value) => value.startsWith("/") && !value.startsWith("//"),
    "Saytdakı ünvanı «/» ilə başlayaraq yazın, məsələn /mehsullar.",
  )
  .refine((value) => !unsafeCharacters.test(value), "Ünvanda boşluq olmamalıdır.")
  .transform((value, context) => {
    const { path, rest } = splitTarget(value);
    const normalized = tryNormalizeLegacyPath(path);
    if (normalized === null || unsafeCharacters.test(normalized)) {
      context.addIssue({ code: "custom", message: "Ünvan düzgün deyil." });
      return z.NEVER;
    }
    return `${normalized}${rest}`;
  });

export const redirectInputSchema = z
  .object({
    fromPath: fromPathSchema,
    toPath: toPathSchema,
    statusCode: z.literal(redirectStatusCodes, "Kodu seçin."),
  })
  .superRefine((value, context) => {
    if (splitTarget(value.toPath).path === value.fromPath) {
      context.addIssue({
        code: "custom",
        path: ["toPath"],
        message: "Köhnə və yeni ünvan eyni ola bilməz.",
      });
    }
  });

export type RedirectInput = z.input<typeof redirectInputSchema>;

export type RedirectValues = z.output<typeof redirectInputSchema>;

export type RedirectDto = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: RedirectStatusCode;
  createdAt: string;
};

export type RedirectSaveResult = { id: string; retargeted: number };

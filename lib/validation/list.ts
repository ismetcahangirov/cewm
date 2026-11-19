import { z } from "zod";

import "./locale";

export const pageSizes = [10, 20, 50] as const;

export function listQuerySchema<const Sort extends readonly [string, ...string[]]>(
  sortFields: Sort,
) {
  return z.object({
    search: z.string().trim().max(100).optional().default(""),
    sort: z.enum(sortFields).optional().default(sortFields[0]),
    order: z.enum(["asc", "desc"]).optional().default("asc"),
    page: z.coerce.number().int().min(0).optional().default(0),
    pageSize: z.coerce
      .number()
      .int()
      .refine((value) => (pageSizes as readonly number[]).includes(value))
      .optional()
      .default(20),
  });
}

export type ListArgs<Sort extends string> = {
  search: string;
  sort: Sort;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
};

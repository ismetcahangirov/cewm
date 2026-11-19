import { z } from "zod";

import "./locale";

import { locales } from "@/lib/i18n/config";

export const profileInputSchema = z.object({ adminLocale: z.enum(locales, "Dili seçin.") });

export type ProfileInput = z.infer<typeof profileInputSchema>;

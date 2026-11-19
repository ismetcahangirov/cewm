import { z } from "zod";

import "./locale";

export const passwordMinLength = 10;

export const signInSchema = z.object({
  email: z.email("E-poçt ünvanı düzgün deyil.").trim().toLowerCase(),
  password: z.string().min(1, "Şifrəni daxil edin."),
});

export const forgotPasswordSchema = z.object({
  email: z.email("E-poçt ünvanı düzgün deyil.").trim().toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(passwordMinLength, `Şifrə ən azı ${passwordMinLength} simvol olmalıdır.`)
      .max(128, "Şifrə çox uzundur."),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Şifrələr eyni deyil.",
  });

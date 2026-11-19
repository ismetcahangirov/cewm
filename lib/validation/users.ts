import { z } from "zod";

import "./locale";

import { userRoles } from "@/lib/db/schema/auth";

import { listQuerySchema, type ListArgs } from "./list";

export const userSortFields = ["name", "email", "role", "lastSignInAt", "createdAt"] as const;

export type UserSortField = (typeof userSortFields)[number];

export const userListQuery = listQuerySchema(userSortFields);

export type UserListArgs = ListArgs<UserSortField>;

export const inviteUserSchema = z.object({
  name: z.string().trim().min(2, "Ad ən azı 2 simvol olmalıdır.").max(80, "Ad çox uzundur."),
  email: z.email("E-poçt ünvanı düzgün deyil.").trim().toLowerCase(),
  role: z.enum(userRoles, "Rol seçin."),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateUserSchema = z
  .object({
    role: z.enum(userRoles, "Rol seçin.").optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => value.role !== undefined || value.active !== undefined, {
    message: "Dəyişiklik yoxdur.",
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export type UserDto = {
  id: string;
  name: string;
  email: string;
  role: (typeof userRoles)[number];
  active: boolean;
  invitePending: boolean;
  lastSignInAt: string | null;
  createdAt: string;
};

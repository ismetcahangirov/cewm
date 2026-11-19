import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

import type { MessageKey } from "@/lib/admin/i18n";
import { userRoles, type UserRole } from "@/lib/db/schema/auth";

export { userRoles, type UserRole };

export const accessControl = createAccessControl(defaultStatements);

export const roles = {
  owner: accessControl.newRole({
    user: ["create", "list", "set-role", "ban", "get", "update"],
    session: ["list", "revoke"],
  }),
  editor: accessControl.newRole({ user: [], session: [] }),
};

export const roleLabels: Record<UserRole, MessageKey> = {
  owner: "Sahib",
  editor: "Redaktor",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (userRoles as readonly string[]).includes(value);
}

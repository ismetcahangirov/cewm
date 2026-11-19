"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { applyServerErrors, FormAlert, FormField, useZodForm } from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MessageKey } from "@/lib/admin/i18n";
import { useT } from "@/lib/admin/i18n/use-t";
import { useInviteUserMutation } from "@/lib/api/admin";
import { isUserRole, roleLabels, userRoles, type UserRole } from "@/lib/auth/roles";
import { inviteUserSchema } from "@/lib/validation/users";

const roleHints: Record<UserRole, MessageKey> = {
  owner: "Bütün bölmələr və istifadəçilərin idarəsi.",
  editor: "Kataloq, məzmun və müraciətlər. İstifadəçiləri görmür.",
};

export function InviteUserDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUser] = useInviteUserMutation();
  const form = useZodForm(inviteUserSchema, {
    defaultValues: { name: "", email: "", role: "editor" },
  });

  const role = form.watch("role");

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const user = await inviteUser(values).unwrap();
      toast.success(t("Dəvət göndərildi: {email}", { email: user.email }));
      form.reset();
      setOpen(false);
    } catch (caught) {
      setError(applyServerErrors(form, caught));
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (form.formState.isSubmitting) return;
        setOpen(next);
        if (!next) {
          form.reset();
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus strokeWidth={1.5} />
          {t("İstifadəçi dəvət et")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("İstifadəçi dəvət et")}</DialogTitle>
          <DialogDescription>
            {t(
              "Göstərilən ünvana şifrə təyin etmək üçün link göndəriləcək. Link 24 saat etibarlıdır.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form id="invite-user" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormAlert message={error} />
          <FormField
            control={form.control}
            name="name"
            label={t("Ad və soyad")}
            required
            render={({ field, id, invalid, describedBy }) => (
              <Input
                {...field}
                id={id}
                autoComplete="off"
                aria-invalid={invalid}
                aria-describedby={describedBy}
              />
            )}
          />
          <FormField
            control={form.control}
            name="email"
            label={t("E-poçt")}
            required
            render={({ field, id, invalid, describedBy }) => (
              <Input
                {...field}
                id={id}
                type="email"
                inputMode="email"
                autoComplete="off"
                aria-invalid={invalid}
                aria-describedby={describedBy}
              />
            )}
          />
          <FormField
            control={form.control}
            name="role"
            label={t("Rol")}
            required
            description={isUserRole(role) ? t(roleHints[role]) : undefined}
            render={({ field, id, invalid, describedBy }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id={id}
                  className="w-full"
                  aria-invalid={invalid}
                  aria-describedby={describedBy}
                  onBlur={field.onBlur}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(roleLabels[role])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            disabled={form.formState.isSubmitting}
            onClick={() => setOpen(false)}
          >
            {t("Ləğv et")}
          </Button>
          <Button type="submit" form="invite-user" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t("Göndərilir") : t("Dəvət göndər")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

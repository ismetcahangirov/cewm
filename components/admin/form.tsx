"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";
import {
  Controller,
  useForm,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import type { z } from "zod";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import type { ApiError } from "@/lib/api/types";
import { isApiError } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/admin/i18n/use-t";

export function useZodForm<Input extends FieldValues, Output extends FieldValues>(
  schema: z.ZodType<Output, Input>,
  options: Omit<UseFormProps<Input, unknown, Output>, "resolver"> = {},
): UseFormReturn<Input, unknown, Output> {
  return useForm<Input, unknown, Output>({
    mode: "onTouched",
    ...options,
    resolver: zodResolver(schema),
  });
}

export function applyServerErrors<Values extends FieldValues>(
  form: UseFormReturn<Values, unknown, FieldValues>,
  error: unknown,
): string | null {
  if (!isApiError(error)) return "Xəta baş verdi. Yenidən cəhd edin.";
  const data: ApiError = error.data;
  for (const [path, message] of Object.entries(data.fields ?? {})) {
    form.setError(path as FieldPath<Values>, { type: "server", message });
  }
  return data.fields && Object.keys(data.fields).length ? null : data.message;
}

type ControlProps<Values extends FieldValues, Name extends FieldPath<Values>> = {
  field: ControllerRenderProps<Values, Name>;
  id: string;
  invalid: boolean;
  describedBy: string | undefined;
};

export function FormField<Values extends FieldValues, Name extends FieldPath<Values>>({
  control,
  name,
  label,
  description,
  required,
  className,
  render,
}: {
  control: Control<Values, unknown, FieldValues>;
  name: Name;
  label: ReactNode;
  description?: ReactNode;
  required?: boolean;
  className?: string;
  render: (props: ControlProps<Values, Name>) => ReactNode;
}) {
  const id = useId();
  const t = useT();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const invalid = fieldState.invalid;
        const describedBy =
          [description ? `${id}-description` : null, invalid ? `${id}-error` : null]
            .filter(Boolean)
            .join(" ") || undefined;
        return (
          <Field data-invalid={invalid} className={className}>
            <FieldLabel htmlFor={id} className="text-meta font-medium">
              {label}
              {required ? (
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              ) : null}
            </FieldLabel>
            {render({ field, id, invalid, describedBy })}
            {description ? (
              <FieldDescription id={`${id}-description`}>{description}</FieldDescription>
            ) : null}
            {invalid ? (
              <FieldError
                id={`${id}-error`}
                errors={[{ message: t.message(fieldState.error?.message ?? "") }]}
                className="text-meta"
              />
            ) : null}
          </Field>
        );
      }}
    />
  );
}

export function FormAlert({ message }: { message: string | null | undefined }) {
  const t = useT();
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-sm border border-destructive px-3 py-2 text-meta text-destructive"
    >
      <CircleAlert className="mt-1 size-4 shrink-0" strokeWidth={1.5} />
      <span>{t.message(message)}</span>
    </p>
  );
}

export function FormLayout({ main, aside }: { main: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      <div
        className={cn("flex min-w-0 flex-col gap-6", aside ? "lg:col-span-8" : "lg:col-span-12")}
      >
        {main}
      </div>
      {aside ? <aside className="flex min-w-0 flex-col gap-6 lg:col-span-4">{aside}</aside> : null}
    </div>
  );
}

export function FormSection({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-sm border border-border bg-white p-4 md:p-6", className)}>
      {title ? <h2 className="mb-4 text-card font-normal text-heading">{title}</h2> : null}
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-5 flex justify-end gap-2 border-t border-border bg-white px-5 py-3 sm:-mx-7.5 sm:px-7.5 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

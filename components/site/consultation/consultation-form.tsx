"use client";

import { ArrowRightIcon, CloseIcon, SpinnerIcon } from "@/components/icons/iconsax";
import Image from "next/image";
import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";

import { button } from "@/components/site/button";
import { cx } from "@/lib/cx";
import type { Locale } from "@/lib/i18n/config";
import { formatPhoneInput } from "@/lib/phone";
import { consultationHoneypotField } from "@/lib/validation/consultation-honeypot";

export type ConsultationFormLabels = {
  name: string;
  phone: string;
  phoneHint: string;
  email: string;
  company: string;
  message: string;
  messagePlaceholder: string;
  products: string;
  removeProduct: string;
  submit: string;
  sending: string;
  required: string;
  errorName: string;
  errorPhone: string;
  errorEmail: string;
  errorTooLong: string;
  errorGeneric: string;
  errorRateLimit: string;
  successTitle: string;
  successBody: string;
  successLink: string;
  honeypot: string;
};

export type ConsultationFormProduct = {
  id: string;
  name: string;
  image: { src: string; alt: string } | null;
};

type Field = "name" | "phone" | "email" | "company" | "message";

type Values = Record<Field, string>;

const empty: Values = { name: "", phone: "", email: "", company: "", message: "" };

const loadConsultation = () => import("./submit-consultation");

function fieldMessage(field: string, labels: ConsultationFormLabels): string {
  if (field === "name") return labels.errorName;
  if (field === "phone") return labels.errorPhone;
  if (field === "email") return labels.errorEmail;
  if (field === "company" || field === "message") return labels.errorTooLong;
  return labels.errorGeneric;
}

function TextField({
  id,
  label,
  required,
  requiredLabel,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  requiredLabel: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="text-meta text-graphite">
        {label}
        {required && (
          <>
            <span aria-hidden="true"> *</span>
            <span className="sr-only"> ({requiredLabel})</span>
          </>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-meta text-graphite">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-meta text-error">
          {error}
        </p>
      )}
    </div>
  );
}

const fieldClass =
  "mt-2 w-full rounded-none border-0 border-b border-black bg-white px-4.5 text-small text-graphite transition-colors duration-300 placeholder:text-graphite aria-invalid:border-error";

const inputClass = `${fieldClass} h-15`;

export function ConsultationForm({
  locale,
  labels,
  initialProducts,
  productsHref,
}: {
  locale: Locale;
  labels: ConsultationFormLabels;
  initialProducts: ConsultationFormProduct[];
  productsHref: string;
}) {
  const uid = useId();
  const [values, setValues] = useState<Values>(empty);
  const [honeypot, setHoneypot] = useState("");
  const [products, setProducts] = useState(initialProducts);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const isLoading = status === "sending";

  const update = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const payload = {
      ...values,
      productIds: products.map((product) => product.id),
      locale,
      [consultationHoneypotField]: honeypot,
    };
    let quote: Awaited<ReturnType<typeof loadConsultation>>;
    try {
      quote = await loadConsultation();
    } catch {
      setFormError(labels.errorGeneric);
      return;
    }
    const parsed = quote.validateConsultation(payload);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]) as Field;
        if (field in empty) next[field] ??= fieldMessage(field, labels);
      }
      setErrors(next);
      const first = Object.keys(next)[0];
      if (first) document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    setStatus("sending");
    const result = await quote.submitConsultation(payload);
    if (!("error" in result) || !result.error) {
      setStatus("sent");
      return;
    }
    setStatus("idle");
    const error = result.error;
    if ("status" in error && error.status === 429) {
      setFormError(labels.errorRateLimit);
      return;
    }
    const fields =
      "data" in error && typeof error.data === "object" && error.data !== null
        ? (error.data as { fields?: Record<string, string> }).fields
        : undefined;
    if (fields) {
      const next: Partial<Record<Field, string>> = {};
      for (const key of Object.keys(fields)) {
        const field = key.split(".")[0] as Field;
        if (field in empty) next[field] = fieldMessage(field, labels);
      }
      if (Object.keys(next).length) {
        setErrors(next);
        return;
      }
    }
    setFormError(labels.errorGeneric);
  };

  if (status === "sent") {
    return (
      <div role="status" className="flex flex-col items-start gap-4">
        <p className="text-h3 text-heading">{labels.successTitle}</p>
        <p>{labels.successBody}</p>
        <Link
          href={productsHref}
          className="group inline-flex min-h-11 items-center gap-3.75 text-small text-graphite"
        >
          <ArrowRightIcon
            aria-hidden="true"
            className="size-4 transition-transform duration-300 group-hover:translate-x-1"
          />
          {labels.successLink}
        </Link>
      </div>
    );
  }

  const describedBy = (field: Field, hint?: boolean) =>
    errors[field] ? `${uid}-${field}-error` : hint ? `${uid}-${field}-hint` : undefined;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      onFocus={() => void loadConsultation().catch(() => undefined)}
      className="flex flex-col gap-7.5"
    >
      {products.length > 0 && (
        <fieldset>
          <legend className="text-meta text-graphite">{labels.products}</legend>
          <ul className="mt-2 flex flex-col gap-2">
            {products.map((product) => (
              <li key={product.id} className="flex items-center gap-4 bg-white pr-1 pl-2">
                {product.image && (
                  <span className="relative size-14 shrink-0 bg-surface">
                    <Image
                      src={product.image.src}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain mix-blend-multiply"
                    />
                  </span>
                )}
                <span className="min-w-0 flex-1 text-small text-fg">{product.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setProducts((current) => current.filter((item) => item.id !== product.id))
                  }
                  aria-label={`${labels.removeProduct}: ${product.name}`}
                  className="inline-flex size-11 shrink-0 items-center justify-center text-graphite hover:text-black"
                >
                  <CloseIcon aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <TextField
        id={`${uid}-name`}
        label={labels.name}
        required
        requiredLabel={labels.required}
        error={errors.name}
      >
        <input
          id={`${uid}-name`}
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy("name")}
          aria-required="true"
          className={inputClass}
        />
      </TextField>

      <TextField
        id={`${uid}-phone`}
        label={labels.phone}
        required
        requiredLabel={labels.required}
        error={errors.phone}
        hint={labels.phoneHint}
      >
        <input
          id={`${uid}-phone`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(event) => update("phone", formatPhoneInput(event.target.value))}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={describedBy("phone", true)}
          aria-required="true"
          className={inputClass}
        />
      </TextField>

      <div className="grid gap-7.5 sm:grid-cols-2">
        <TextField
          id={`${uid}-email`}
          label={labels.email}
          requiredLabel={labels.required}
          error={errors.email}
        >
          <input
            id={`${uid}-email`}
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("email")}
            className={inputClass}
          />
        </TextField>
        <TextField
          id={`${uid}-company`}
          label={labels.company}
          requiredLabel={labels.required}
          error={errors.company}
        >
          <input
            id={`${uid}-company`}
            name="company"
            autoComplete="organization"
            value={values.company}
            onChange={(event) => update("company", event.target.value)}
            aria-invalid={errors.company ? true : undefined}
            aria-describedby={describedBy("company")}
            className={inputClass}
          />
        </TextField>
      </div>

      <TextField
        id={`${uid}-message`}
        label={labels.message}
        requiredLabel={labels.required}
        error={errors.message}
      >
        <textarea
          id={`${uid}-message`}
          name="message"
          rows={4}
          placeholder={labels.messagePlaceholder}
          value={values.message}
          onChange={(event) => update("message", event.target.value)}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={describedBy("message")}
          className={cx(fieldClass, "min-h-25 resize-y py-4")}
        />
      </TextField>

      <div className="sr-only" aria-hidden="true">
        <label htmlFor={`${uid}-website`}>{labels.honeypot}</label>
        <input
          id={`${uid}-website`}
          name={consultationHoneypotField}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      {formError && (
        <p role="alert" className="text-meta text-error">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        aria-busy={isLoading || undefined}
        className={cx(button(), "self-start disabled:opacity-50 max-sm:w-full")}
      >
        {isLoading && (
          <SpinnerIcon aria-hidden="true" className="size-4 motion-safe:animate-spin" />
        )}
        {isLoading ? labels.sending : labels.submit}
      </button>
    </form>
  );
}

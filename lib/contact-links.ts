import { normalizeAzerbaijaniPhone } from "./phone";

function internationalDigits(number: string): string {
  const normalized = normalizeAzerbaijaniPhone(number);
  return (normalized ?? number).replace(/\D/g, "");
}

export function telHref(number: string): string {
  const normalized = normalizeAzerbaijaniPhone(number);
  if (normalized) return `tel:${normalized}`;
  const digits = number.replace(/\D/g, "");
  return `tel:${number.trim().startsWith("+") ? "+" : ""}${digits}`;
}

export function whatsappHref(number: string, text?: string): string {
  const url = `https://wa.me/${internationalDigits(number)}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
}

export function mailtoHref(email: string, subject?: string): string {
  const address = email.trim();
  return subject ? `mailto:${address}?subject=${encodeURIComponent(subject)}` : `mailto:${address}`;
}

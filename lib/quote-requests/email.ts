import "server-only";

import { escapeHtml, type MailMessage } from "@/lib/mail";
import { formatAzerbaijaniPhone } from "@/lib/phone";
import { quoteRequestLocaleLabels } from "@/lib/validation/quote-requests";
import type { Locale } from "@/lib/i18n/config";

export type QuoteRequestEmail = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  message: string | null;
  locale: Locale;
  products: string[];
};

export function quoteRequestEmail(
  request: QuoteRequestEmail,
  to: string,
  adminUrl: string,
): MailMessage {
  const url = `${adminUrl.replace(/\/$/, "")}/admin/requests/${request.id}`;
  const contact: [string, string | null][] = [
    ["Ad", request.name],
    ["Telefon", formatAzerbaijaniPhone(request.phone)],
    ["E-poçt", request.email],
    ["Şirkət", request.company],
    ["Dil", quoteRequestLocaleLabels[request.locale]],
  ];
  const filled = contact.filter((entry): entry is [string, string] => Boolean(entry[1]));

  const text = [
    "Saytdan yeni təklif sorğusu gəlib.",
    "",
    ...filled.map(([label, value]) => `${label}: ${value}`),
    "",
    "Mesaj:",
    request.message ?? "Mesaj yazılmayıb.",
    "",
    "Məhsullar:",
    ...(request.products.length
      ? request.products.map((name) => `- ${name}`)
      : ["Məhsul seçilməyib."]),
    "",
    `Müraciətə bax: ${url}`,
  ].join("\n");

  const rows = filled
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#767676">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const productList = request.products.length
    ? `<ul style="margin:0;padding-left:20px">${request.products.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>`
    : `<p style="margin:0;color:#767676">Məhsul seçilməyib.</p>`;
  const message = request.message
    ? `<p style="margin:0;white-space:pre-line">${escapeHtml(request.message)}</p>`
    : `<p style="margin:0;color:#767676">Mesaj yazılmayıb.</p>`;

  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#303030">
<p>Saytdan yeni təklif sorğusu gəlib.</p>
<table style="border-collapse:collapse;font-size:15px">${rows}</table>
<p style="margin:16px 0 4px;color:#767676">Mesaj</p>
${message}
<p style="margin:16px 0 4px;color:#767676">Məhsullar</p>
${productList}
<p style="margin-top:24px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 24px;border-radius:999px;background:#54565a;color:#ffffff;text-decoration:none">Müraciətə bax</a></p>
</div>`;

  return {
    to,
    subject: `Yeni müraciət: ${request.name}`,
    text,
    html,
    ...(request.email ? { replyTo: request.email } : {}),
  };
}

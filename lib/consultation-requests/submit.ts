import "server-only";

import { createHmac } from "node:crypto";

import { and, count, eq, gte, inArray, isNull, sql } from "drizzle-orm";

import { readSettingsRow } from "@/lib/admin/settings";
import { getDb } from "@/lib/db";
import { products, consultationRequestProducts, consultationRequests } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env.server";
import { sendMail } from "@/lib/mail";
import {
  consultationRateLimit,
  type ConsultationSubmissionValues,
} from "@/lib/validation/consultation-requests";

import { consultationRequestEmail } from "./email";

export function clientIp(headers: Headers): string | null {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  return headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || null;
}

export function hashClientIp(ip: string): string {
  return createHmac("sha256", serverEnv().BETTER_AUTH_SECRET).update(ip).digest("hex");
}

export async function recentRequestCount(ipHash: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(consultationRequests)
    .where(
      and(
        eq(consultationRequests.ipHash, ipHash),
        gte(
          consultationRequests.createdAt,
          sql`now() - make_interval(mins => ${consultationRateLimit.windowMinutes})`,
        ),
      ),
    );
  return row?.value ?? 0;
}

async function attachableProducts(ids: string[]) {
  if (!ids.length) return [];
  const rows = await getDb()
    .select({ id: products.id, name: products.name, sku: products.sku })
    .from(products)
    .where(and(inArray(products.id, ids), isNull(products.deletedAt)));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [{ id: row.id, name: row.sku ? `${row.name.az} (${row.sku})` : row.name.az }];
  });
}

export type SubmitResult = { status: "created"; id: string } | { status: "rate-limited" };

export async function submitConsultationRequest(
  values: ConsultationSubmissionValues,
  ip: string | null,
): Promise<SubmitResult> {
  const ipHash = ip ? hashClientIp(ip) : null;
  if (ipHash && (await recentRequestCount(ipHash)) >= consultationRateLimit.requests) {
    return { status: "rate-limited" };
  }

  const attached = await attachableProducts(values.productIds);
  const id = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .insert(consultationRequests)
      .values({
        name: values.name,
        phone: values.phone,
        email: values.email,
        company: values.company,
        message: values.message,
        locale: values.locale,
        ipHash,
      })
      .returning({ id: consultationRequests.id });
    if (!row) throw new Error("Consultation request was not created");
    if (attached.length) {
      await tx.insert(consultationRequestProducts).values(
        attached.map((product) => ({
          consultationRequestId: row.id,
          productId: product.id,
          productName: product.name,
        })),
      );
    }
    return row.id;
  });

  try {
    const env = serverEnv();
    const settingsRow = await readSettingsRow();
    await sendMail(
      consultationRequestEmail(
        {
          id,
          name: values.name,
          phone: values.phone,
          email: values.email,
          company: values.company,
          message: values.message,
          locale: values.locale,
          products: attached.map((product) => product.name),
        },
        settingsRow?.consultationNotifyEmail ?? env.CONSULTATION_NOTIFY_EMAIL,
        env.BETTER_AUTH_URL,
      ),
    );
  } catch (error) {
    console.error(`Consultation request ${id} was saved, but the notification email failed`, error);
  }

  return { status: "created", id };
}

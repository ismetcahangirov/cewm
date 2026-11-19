import { randomInt, randomUUID } from "node:crypto";

import { eq, inArray, like } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { POST as submitRoute } from "@/app/api/consultation-requests/route";
import { getDashboardSummary } from "@/lib/admin/dashboard";
import { toCsv } from "@/lib/csv";
import { getDb } from "@/lib/db";
import {
  products,
  consultationRequestProducts,
  consultationRequests,
  settings,
} from "@/lib/db/schema";
import { normalizeAzerbaijaniPhone } from "@/lib/phone";
import { clientIp } from "@/lib/consultation-requests/submit";
import type {
  ConsultationRequestDetailDto,
  ConsultationRequestListItemDto,
} from "@/lib/validation/consultation-requests";

import { call, createUser, origin, removeUsers, sessionCookie, testRun } from "./support/admin";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

const mailState = vi.hoisted(() => ({ fail: false }));

vi.mock("@/lib/mail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mail")>();
  return {
    ...actual,
    sendMail: async (message: Parameters<typeof actual.sendMail>[0]) => {
      if (mailState.fail) throw new Error("SMTP is down");
      return actual.sendMail(message);
    },
  };
});

const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8025";
const { run, domain, password } = testRun();
const notifyEmail = `notify-${run}@cewm.test`;

let owner = "";
let editor = "";
let productId = "";
let trashedProductId = "";
let savedSettings: { email: string | null; updatedAt: Date } | undefined;

function fakeIp(): string {
  return `198.18.${randomInt(0, 255)}.${randomInt(1, 255)}`;
}

function submit(body: unknown, ip = fakeIp()): Promise<Response> {
  return submitRoute(
    new NextRequest(new URL("/api/consultation-requests", origin), {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.9, ${ip}` },
      body: JSON.stringify(body),
    }),
  );
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    name: `Test ${run}`,
    phone: "055 255 54 23",
    productIds: [],
    locale: "az",
    website: "",
    ...overrides,
  };
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function createRequest(overrides: Record<string, unknown> = {}): Promise<string> {
  const response = await submit(payload(overrides));
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(201);
  return (await json<{ id: string }>(response)).id;
}

type MailpitSummary = { ID: string; Subject: string };

async function findMail(query: string): Promise<MailpitSummary[]> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(query)}`);
    const found = (await response.json()) as { messages: MailpitSummary[] };
    if (found.messages.length) return found.messages;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return [];
}

async function unreadCount(): Promise<number> {
  const response = await call("/api/admin/consultation-requests/unread-count", "GET", {
    cookie: owner,
  });
  return (await json<{ count: number }>(response)).count;
}

beforeAll(async () => {
  const ownerUser = await createUser("owner", domain, password);
  const editorUser = await createUser("editor", domain, password);
  owner = await sessionCookie(ownerUser.email, password);
  editor = await sessionCookie(editorUser.email, password);

  const db = getDb();
  const [product] = await db
    .insert(products)
    .values({
      name: { az: `Ofis kreslosu ${run}` },
      slug: { az: `ofis-kreslosu-${run}` },
      sku: `QR-${run}`,
      status: "published",
    })
    .returning({ id: products.id });
  const [trashed] = await db
    .insert(products)
    .values({
      name: { az: `Silinmiş masa ${run}` },
      slug: { az: `silinmis-masa-${run}` },
      deletedAt: new Date(),
    })
    .returning({ id: products.id });
  productId = product?.id ?? "";
  trashedProductId = trashed?.id ?? "";

  [savedSettings] = await db
    .select({ email: settings.consultationNotifyEmail, updatedAt: settings.updatedAt })
    .from(settings);
  if (!savedSettings) await db.insert(settings).values({ id: 1 });
});

afterAll(async () => {
  const db = getDb();
  await db.delete(consultationRequests).where(like(consultationRequests.name, `%${run}%`));
  await db.delete(products).where(inArray(products.id, [productId, trashedProductId]));
  if (savedSettings) {
    await db
      .update(settings)
      .set({ consultationNotifyEmail: savedSettings.email, updatedAt: savedSettings.updatedAt })
      .where(eq(settings.id, 1));
  } else {
    await db.delete(settings).where(eq(settings.id, 1));
  }
  await removeUsers(domain);
});

describe("Azerbaijani phone numbers", () => {
  it.each([
    ["+994 55 255 54 23", "+994552555423"],
    ["+994552555423", "+994552555423"],
    ["994552555423", "+994552555423"],
    ["055 255 54 23", "+994552555423"],
    ["(055) 255-54-23", "+994552555423"],
    ["+994 (0)50 123 45 67", "+994501234567"],
    ["50 123 45 67", "+994501234567"],
    ["(012) 526-54-23", "+994125265423"],
    ["010 555 00 11", "+994105550011"],
    ["077.123.45.67", "+994771234567"],
  ])("normalises %s", (input, expected) => {
    expect(normalizeAzerbaijaniPhone(input)).toBe(expected);
  });

  it.each(["+7 912 123 45 67", "055 255 54", "+994 33 123 45 67", "0552555423999", "telefon", ""])(
    "rejects %s",
    (input) => {
      expect(normalizeAzerbaijaniPhone(input)).toBeNull();
    },
  );
});

describe("public quote submission", () => {
  it("saves the request with live products and emails the owner", async () => {
    await getDb()
      .update(settings)
      .set({ consultationNotifyEmail: notifyEmail })
      .where(eq(settings.id, 1));
    const ip = fakeIp();
    const response = await submit(
      payload({
        name: `Rəşad ${run} Əliyev`,
        phone: "+994 (50) 111-22-33",
        email: `client-${run}@example.com`,
        company: "Azersun",
        message: "Salam.\n<b>20 iş yeri</b> lazımdır.",
        productIds: [productId, trashedProductId, randomUUID()],
        locale: "ru",
      }),
      ip,
    );
    expect(response.status).toBe(201);
    const { id } = await json<{ id: string }>(response);

    const db = getDb();
    const [row] = await db
      .select()
      .from(consultationRequests)
      .where(eq(consultationRequests.id, id));
    expect(row).toMatchObject({
      phone: "+994501112233",
      email: `client-${run}@example.com`,
      company: "Azersun",
      locale: "ru",
      status: "new",
    });
    expect(row?.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row?.ipHash).not.toContain(ip);
    const items = await db
      .select()
      .from(consultationRequestProducts)
      .where(eq(consultationRequestProducts.consultationRequestId, id));
    expect(items.map((item) => [item.productId, item.productName])).toEqual([
      [productId, `Ofis kreslosu ${run} (QR-${run})`],
    ]);

    const [mail] = await findMail(`subject:"${run}"`);
    expect(mail?.Subject).toBe(`Yeni müraciət: Rəşad ${run} Əliyev`);
    const message = (await (await fetch(`${mailpit}/api/v1/message/${mail?.ID}`)).json()) as {
      To: { Address: string }[];
      ReplyTo: { Address: string }[];
      Text: string;
      HTML: string;
    };
    expect(message.To.map((to) => to.Address)).toEqual([notifyEmail]);
    expect(message.ReplyTo.map((to) => to.Address)).toEqual([`client-${run}@example.com`]);
    expect(message.Text).toContain(`/admin/requests/${id}`);
    expect(message.Text).toContain("+994 50 111 22 33");
    expect(message.HTML).toContain("&lt;b&gt;20 iş yeri&lt;/b&gt;");
    expect(message.HTML).not.toContain("<b>20");
  });

  it("answers a filled honeypot like a success without saving", async () => {
    const response = await submit(payload({ name: `Bot ${run}`, website: "https://spam.test" }));
    expect(response.status).toBe(201);
    const { id } = await json<{ id: string }>(response);
    const rows = await getDb()
      .select({ id: consultationRequests.id })
      .from(consultationRequests)
      .where(like(consultationRequests.name, `Bot ${run}%`));
    expect(rows).toEqual([]);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await findMail(`subject:"Bot ${run}"`)).toEqual([]);
  });

  it("rejects an invalid phone with a field message", async () => {
    const response = await submit(payload({ phone: "+7 912 123 45 67", name: "A" }));
    expect(response.status).toBe(400);
    const body = await json<{ fields: Record<string, string> }>(response);
    expect(Object.keys(body.fields).sort()).toEqual(["name", "phone"]);
    expect(body.fields.phone).toContain("+994");
  });

  it("refuses the sixth request from one address within an hour", async () => {
    const ip = fakeIp();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      statuses.push((await submit(payload({ name: `Limit ${run} ${attempt}` }), ip)).status);
    }
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
    const other = await submit(payload({ name: `Limit ${run} other` }));
    expect(other.status).toBe(201);
  });

  it("keeps the request when the email fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mailState.fail = true;
    try {
      const id = await createRequest({ name: `Mail down ${run}` });
      const [row] = await getDb()
        .select()
        .from(consultationRequests)
        .where(eq(consultationRequests.id, id));
      expect(row?.name).toBe(`Mail down ${run}`);
      expect(error).toHaveBeenCalled();
    } finally {
      mailState.fail = false;
      error.mockRestore();
    }
  });

  it("falls back to the server address when settings has none", async () => {
    await getDb().update(settings).set({ consultationNotifyEmail: null }).where(eq(settings.id, 1));
    await createRequest({ name: `Fallback ${run}` });
    const [mail] = await findMail(`subject:"Fallback ${run}"`);
    const message = (await (await fetch(`${mailpit}/api/v1/message/${mail?.ID}`)).json()) as {
      To: { Address: string }[];
      ReplyTo: { Address: string }[];
    };
    expect(message.To.map((to) => to.Address)).toEqual([process.env.CONSULTATION_NOTIFY_EMAIL]);
    expect(message.ReplyTo).toEqual([]);
  });
});

describe("quote request inbox", () => {
  it("lists, filters and searches requests", async () => {
    const digits = String(randomInt(1_000_000, 9_999_999));
    const id = await createRequest({
      name: `Inbox ${run}`,
      phone: `+99470${digits}`,
      company: `Şirkət ${run}`,
      productIds: [productId],
    });

    const list = async (query: string) => {
      const response = await call("/api/admin/consultation-requests", "GET", {
        cookie: editor,
        path: `/api/admin/consultation-requests?${query}`,
      });
      expect(response.status).toBe(200);
      return json<{ rows: ConsultationRequestListItemDto[]; rowCount: number }>(response);
    };

    const byRun = await list(`search=${run}&pageSize=50`);
    expect(byRun.rows.length).toBeGreaterThan(3);
    const times = byRun.rows.map((row) => row.createdAt);
    expect(times).toEqual([...times].sort().reverse());
    expect(byRun.rows.find((row) => row.id === id)).toMatchObject({
      productCount: 1,
      status: "new",
      company: `Şirkət ${run}`,
    });

    const byPhone = await list(`search=${encodeURIComponent(`070 ${digits}`)}`);
    expect(byPhone.rows.map((row) => row.id)).toEqual([id]);

    const byCompany = await list(`search=${encodeURIComponent(`Şirkət ${run}`)}`);
    expect(byCompany.rows.map((row) => row.id)).toEqual([id]);

    const done = await list(`search=${run}&status=done`);
    expect(done.rowCount).toBe(0);

    const invalid = await call("/api/admin/consultation-requests", "GET", {
      cookie: editor,
      path: "/api/admin/consultation-requests?status=spam",
    });
    expect(invalid.status).toBe(400);
  });

  it("marks a new request as seen once and updates the unread count", async () => {
    const before = await unreadCount();
    const id = await createRequest({ name: `Detail ${run}`, productIds: [productId] });
    expect(await unreadCount()).toBe(before + 1);

    const open = async () => {
      const response = await call("/api/admin/consultation-requests/[id]", "GET", {
        cookie: editor,
        params: { id },
      });
      expect(response.status).toBe(200);
      return json<ConsultationRequestDetailDto>(response);
    };

    const first = await open();
    expect(first).toMatchObject({ status: "in-progress", markedSeen: true, locale: "az" });
    expect(first.products).toEqual([
      expect.objectContaining({ productId, name: `Ofis kreslosu ${run} (QR-${run})` }),
    ]);
    expect(await unreadCount()).toBe(before);

    const second = await open();
    expect(second).toMatchObject({ status: "in-progress", markedSeen: false });

    const missing = await call("/api/admin/consultation-requests/[id]", "GET", {
      cookie: editor,
      params: { id: randomUUID() },
    });
    expect(missing.status).toBe(404);
  });

  it("saves the internal note and status separately", async () => {
    const id = await createRequest({ name: `Patch ${run}` });
    const patch = (body: unknown) =>
      call("/api/admin/consultation-requests/[id]", "PATCH", {
        cookie: editor,
        body,
        params: { id },
      });

    const noted = await patch({ internalNote: "  Zəng edildi, sabah ofisə gələcək.  " });
    expect(noted.status).toBe(200);
    expect(await json<ConsultationRequestDetailDto>(noted)).toMatchObject({
      internalNote: "Zəng edildi, sabah ofisə gələcək.",
      status: "new",
    });

    const before = await unreadCount();
    const answered = await patch({ status: "done" });
    expect(await json<ConsultationRequestDetailDto>(answered)).toMatchObject({
      internalNote: "Zəng edildi, sabah ofisə gələcək.",
      status: "done",
    });
    expect(await unreadCount()).toBe(before - 1);

    const cleared = await patch({ internalNote: "" });
    expect(await json<ConsultationRequestDetailDto>(cleared)).toMatchObject({
      internalNote: null,
      status: "done",
    });

    expect((await patch({})).status).toBe(400);
    expect((await patch({ status: "spam" })).status).toBe(400);
  });

  it("lets only the owner delete a request", async () => {
    const id = await createRequest({ name: `Spam ${run}` });
    const byEditor = await call("/api/admin/consultation-requests/[id]", "DELETE", {
      cookie: editor,
      params: { id },
    });
    expect(byEditor.status).toBe(403);

    const byOwner = await call("/api/admin/consultation-requests/[id]", "DELETE", {
      cookie: owner,
      params: { id },
    });
    expect(byOwner.status).toBe(204);
    const [row] = await getDb()
      .select()
      .from(consultationRequests)
      .where(eq(consultationRequests.id, id));
    expect(row).toBeUndefined();
  });

  it("exports the filtered requests as Excel-friendly CSV", async () => {
    await createRequest({
      name: `=HYPERLINK("https://evil.test") ${run}`,
      message: 'Dedi: "iki masa"; sonra\nzəng edin',
      company: `@Export ${run}`,
      productIds: [productId],
    });

    const response = await call("/api/admin/consultation-requests/export", "GET", {
      cookie: editor,
      path: `/api/admin/consultation-requests/export?search=${encodeURIComponent(`@Export ${run}`)}`,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="muracietler-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = new TextDecoder().decode(bytes).split("\r\n");
    expect(lines[0]).toBe(
      '"Tarix";"Ad";"Telefon";"E-poçt";"Şirkət";"Məhsullar";"Mesaj";"Status";"Dil";"Daxili qeyd"',
    );
    const body = lines.slice(1).join("\r\n");
    expect(body).toContain(`"'=HYPERLINK(""https://evil.test"") ${run}"`);
    expect(body).toContain(`"'+994552555423"`);
    expect(body).toContain(`"'@Export ${run}"`);
    expect(body).toContain(`"Ofis kreslosu ${run} (QR-${run})"`);
    expect(body).toContain('"Dedi: ""iki masa""; sonra\nzəng edin"');
    expect(body).toContain('"Yeni";"Azərbaycanca"');
    expect(lines.length).toBe(2);

    const none = await call("/api/admin/consultation-requests/export", "GET", {
      cookie: owner,
      path: `/api/admin/consultation-requests/export?search=${encodeURIComponent(`@Export ${run}`)}&status=done`,
    });
    const empty = new TextDecoder().decode(new Uint8Array(await none.arrayBuffer()));
    expect(empty.split("\r\n")).toHaveLength(1);
  });

  it("guards every formula start character", () => {
    const csv = toCsv([["=1+1", "+1", "-1", "@SUM(A1)", "\tx", "plain", null, 5]]);
    expect(csv.slice(1)).toBe(`"'=1+1";"'+1";"'-1";"'@SUM(A1)";"'\tx";"plain";"";"5"`);
  });
});

describe("dashboard", () => {
  it("counts the products of each latest request", async () => {
    const db = getDb();
    const [request] = await db
      .insert(consultationRequests)
      .values({
        name: `Dashboard ${run}`,
        phone: "+994552555423",
        createdAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      .returning({ id: consultationRequests.id });
    const id = request?.id ?? "";
    await db.insert(consultationRequestProducts).values([
      { consultationRequestId: id, productId, productName: "Kreslo" },
      { consultationRequestId: id, productId: null, productName: "Köhnə masa" },
    ]);

    const summary = await getDashboardSummary();
    const latest = summary.latestRequests.find((row) => row.id === id);
    expect(latest?.productCount).toBe(2);
    const others = summary.latestRequests.filter((row) => row.id !== id);
    for (const row of others) {
      const items = await db
        .select({ id: consultationRequestProducts.id })
        .from(consultationRequestProducts)
        .where(eq(consultationRequestProducts.consultationRequestId, row.id));
      expect(row.productCount).toBe(items.length);
    }
  });
});

describe("client IP for the rate limit", () => {
  it("trusts the proxy over what the client sends", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(
      clientIp(
        new Headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.7", "x-real-ip": "198.51.100.7" }),
      ),
    ).toBe("198.51.100.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.8" }))).toBe(
      "198.51.100.8",
    );
    expect(clientIp(new Headers())).toBeNull();
  });
});

import { inArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import { contactPersons, media } from "@/lib/db/schema";
import { queryContactPersons } from "@/lib/public/contacts";
import type { ContactPersonDto, ContactPersonInput } from "@/lib/validation/contact-persons";

import { call, createUser, removeUsers, sessionCookie, testRun } from "./support/admin";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

const { run, domain, password } = testRun();

let editor = "";
let photoId = "";

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function input(name: string, overrides: Partial<ContactPersonInput> = {}): ContactPersonInput {
  return {
    name: { az: `${name} ${run}`, ru: "", en: `${name} EN ${run}`, de: "" },
    role: { az: "Satış meneceri", ru: "Менеджер по продажам", en: "", de: "Vertriebsmanager" },
    phones: [],
    email: "",
    whatsapp: "",
    photoId: "",
    isActive: true,
    ...overrides,
  };
}

async function create(name: string, overrides: Partial<ContactPersonInput> = {}): Promise<string> {
  const response = await call("/api/admin/contact-persons", "POST", {
    cookie: editor,
    body: input(name, overrides),
  });
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(201);
  return (await json<{ id: string }>(response)).id;
}

async function list(): Promise<ContactPersonDto[]> {
  const all = await json<ContactPersonDto[]>(
    await call("/api/admin/contact-persons", "GET", { cookie: editor }),
  );
  return all.filter((person) => person.name.az.endsWith(run));
}

beforeAll(async () => {
  const user = await createUser("editor", domain, password);
  editor = await sessionCookie(user.email, password);
  const [row] = await getDb()
    .insert(media)
    .values({
      key: `tests/contact-${run}.jpg`,
      mimeType: "image/jpeg",
      width: 800,
      height: 800,
      size: 1000,
      sha256: `contact-${run}`,
    })
    .returning({ id: media.id });
  photoId = row?.id ?? "";
});

afterAll(async () => {
  await getDb()
    .delete(contactPersons)
    .where(sql`${contactPersons.name} ->> 'az' like ${`%${run}`}`);
  if (photoId)
    await getDb()
      .delete(media)
      .where(inArray(media.id, [photoId]));
  await removeUsers(domain);
});

describe("contact persons", () => {
  it("lets an editor create, update, hide, reorder and delete a contact person", async () => {
    const id = await create("Aysel", {
      photoId,
      phones: [{ number: "012 480 05 70" }, { number: "+994 55 716 03 66" }],
      whatsapp: "055 716 03 66",
      email: "aysel@cewm.test",
    });
    expect(vi.mocked(revalidateTag).mock.calls.map(([tag]) => tag)).toContain("content");

    const [created] = (await list()).filter((person) => person.id === id);
    expect(created).toMatchObject({
      name: { az: `Aysel ${run}`, ru: null, en: `Aysel EN ${run}`, de: null },
      role: { az: "Satış meneceri", ru: "Менеджер по продажам", en: null, de: "Vertriebsmanager" },
      phones: ["+994124800570", "+994557160366"],
      whatsapp: "+994557160366",
      email: "aysel@cewm.test",
      isActive: true,
    });
    expect(created?.photo?.id).toBe(photoId);

    const inGerman = (await queryContactPersons("de")).find((person) => person.id === id);
    expect(inGerman).toMatchObject({ name: `Aysel ${run}`, role: "Vertriebsmanager" });

    const updated = await call("/api/admin/contact-persons/[id]", "PUT", {
      cookie: editor,
      params: { id },
      body: input("Aysel", { role: { az: "Direktor" } }),
    });
    expect(updated.status).toBe(200);
    const [after] = (await list()).filter((person) => person.id === id);
    expect(after).toMatchObject({ role: { az: "Direktor" }, phones: [], photo: null });

    const second = await create("Rəşad");
    const all = await json<ContactPersonDto[]>(
      await call("/api/admin/contact-persons", "GET", { cookie: editor }),
    );
    const orderedIds = [
      second,
      ...all.map((person) => person.id).filter((value) => value !== second),
    ];
    const reorder = await call("/api/admin/contact-persons/reorder", "POST", {
      cookie: editor,
      body: { orderedIds },
    });
    expect(reorder.status).toBe(204);
    const stale = await call("/api/admin/contact-persons/reorder", "POST", {
      cookie: editor,
      body: { orderedIds: orderedIds.slice(1) },
    });
    expect(stale.status).toBe(409);

    const hidden = await call("/api/admin/contact-persons/[id]", "PATCH", {
      cookie: editor,
      params: { id },
      body: { isActive: false },
    });
    expect(hidden.status).toBe(204);
    expect((await queryContactPersons("az")).some((person) => person.id === id)).toBe(false);

    const removed = await call("/api/admin/contact-persons/[id]", "DELETE", {
      cookie: editor,
      params: { id },
    });
    expect(removed.status).toBe(204);
    expect((await list()).some((person) => person.id === id)).toBe(false);
  });

  it("rejects missing names, bad phones, emails and photos", async () => {
    const cases: Partial<ContactPersonInput>[] = [
      { name: { az: "", ru: "", en: "", de: "" } },
      { role: { az: "", ru: "", en: "", de: "" } },
      { phones: [{ number: "12345" }] },
      { whatsapp: "12345" },
      { email: "not-an-email" },
      { photoId: "00000000-0000-4000-8000-000000000000" },
    ];
    for (const overrides of cases) {
      const response = await call("/api/admin/contact-persons", "POST", {
        cookie: editor,
        body: input("Səhv", overrides),
      });
      expect(response.status, JSON.stringify(overrides)).toBe(400);
    }
  });
});

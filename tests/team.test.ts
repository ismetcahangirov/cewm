import { inArray, like } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import { media, teamMembers } from "@/lib/db/schema";
import { plural } from "@/lib/i18n/plural";
import { queryTeamMembers } from "@/lib/public/team";
import {
  bakuYear,
  yearsSince,
  type TeamMemberDto,
  type TeamMemberInput,
} from "@/lib/validation/team";

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

function input(name: string, overrides: Partial<TeamMemberInput> = {}): TeamMemberInput {
  return {
    name: `${name} ${run}`,
    role: { az: "Satış meneceri", ru: "Менеджер по продажам", en: "" },
    bio: { az: `Ofis layihələri ${name}`, ru: "", en: "" },
    photoId: "",
    startedYear: 2019,
    phone: "",
    email: "",
    isActive: true,
    ...overrides,
  };
}

async function create(name: string, overrides: Partial<TeamMemberInput> = {}): Promise<string> {
  const response = await call("/api/admin/team", "POST", {
    cookie: editor,
    body: input(name, overrides),
  });
  expect(response.status).toBe(201);
  return (await json<{ id: string }>(response)).id;
}

async function list(): Promise<TeamMemberDto[]> {
  const all = await json<TeamMemberDto[]>(await call("/api/admin/team", "GET", { cookie: editor }));
  return all.filter((member) => member.name.endsWith(run));
}

beforeAll(async () => {
  const user = await createUser("editor", domain, password);
  editor = await sessionCookie(user.email, password);
  const [row] = await getDb()
    .insert(media)
    .values({
      key: `tests/team-${run}.jpg`,
      mimeType: "image/jpeg",
      width: 800,
      height: 800,
      size: 1000,
      sha256: `team-${run}`,
    })
    .returning({ id: media.id });
  photoId = row?.id ?? "";
});

afterAll(async () => {
  await getDb()
    .delete(teamMembers)
    .where(like(teamMembers.name, `%${run}`));
  if (photoId)
    await getDb()
      .delete(media)
      .where(inArray(media.id, [photoId]));
  await removeUsers(domain);
});

describe("team members", () => {
  it("lets an editor create, update, hide and delete a member", async () => {
    const id = await create("Aysel", {
      photoId,
      phone: "055 255 54 23",
      email: "aysel@mebline.test",
    });
    expect(vi.mocked(revalidateTag).mock.calls.map(([tag]) => tag)).toContain("content");

    const [created] = (await list()).filter((member) => member.id === id);
    expect(created).toMatchObject({
      role: { az: "Satış meneceri", ru: "Менеджер по продажам", en: null },
      startedYear: 2019,
      phone: "+994552555423",
      email: "aysel@mebline.test",
      isActive: true,
    });
    expect(created?.photo?.id).toBe(photoId);

    const updated = await call("/api/admin/team/[id]", "PUT", {
      path: `/api/admin/team/${id}`,
      cookie: editor,
      params: { id },
      body: input("Aysel", { role: { az: "Baş dizayner", ru: "", en: "" }, startedYear: "" }),
    });
    expect(updated.status).toBe(200);
    const [after] = (await list()).filter((member) => member.id === id);
    expect(after).toMatchObject({ role: { az: "Baş dizayner" }, startedYear: null, photo: null });

    const hidden = await call("/api/admin/team/[id]", "PATCH", {
      path: `/api/admin/team/${id}`,
      cookie: editor,
      params: { id },
      body: { isActive: false },
    });
    expect(hidden.status).toBe(204);
    const visible = await queryTeamMembers("az");
    expect(visible.some((member) => member.id === id)).toBe(false);

    const removed = await call("/api/admin/team/[id]", "DELETE", {
      path: `/api/admin/team/${id}`,
      cookie: editor,
      params: { id },
    });
    expect(removed.status).toBe(204);
    expect((await list()).some((member) => member.id === id)).toBe(false);
  });

  it("accepts any role text and rejects bad years, phones and photos", async () => {
    const custom = await create("Rəşad", {
      role: { az: "Layihə rəhbəri və quraşdırma ustası", ru: "", en: "" },
    });
    expect(custom).toBeTruthy();

    const cases: Partial<TeamMemberInput>[] = [
      { role: { az: "", ru: "", en: "" } },
      { startedYear: bakuYear() + 1 },
      { startedYear: 1980 },
      { phone: "12345" },
      { email: "not-an-email" },
      { photoId: "00000000-0000-4000-8000-000000000000" },
    ];
    for (const overrides of cases) {
      const response = await call("/api/admin/team", "POST", {
        cookie: editor,
        body: input("Səhv", overrides),
      });
      expect(response.status, JSON.stringify(overrides)).toBe(400);
    }
  });

  it("reorders members and shows only active ones on the site in that order", async () => {
    const first = await create("Birinci");
    const second = await create("İkinci");
    const order = (await list()).map((member) => member.id);
    const reversed = [...order].reverse();
    const all = await json<TeamMemberDto[]>(
      await call("/api/admin/team", "GET", { cookie: editor }),
    );
    const others = all.filter((member) => !member.name.endsWith(run)).map((member) => member.id);
    const response = await call("/api/admin/team/reorder", "POST", {
      cookie: editor,
      body: { orderedIds: [...others, ...reversed] },
    });
    expect(response.status).toBe(204);

    const publicIds = (await queryTeamMembers("ru")).map((member) => member.id);
    expect(publicIds.indexOf(second)).toBeLessThan(publicIds.indexOf(first));
    const shown = (await queryTeamMembers("en")).find((member) => member.id === first);
    expect(shown?.role).toBe("Satış meneceri");

    const stale = await call("/api/admin/team/reorder", "POST", {
      cookie: editor,
      body: { orderedIds: [first] },
    });
    expect(stale.status).toBe(409);
  });

  it("refuses anonymous requests", async () => {
    const response = await call("/api/admin/team", "POST", { body: input("Anonim") });
    expect(response.status).toBe(401);
  });

  it("counts years since the start year and words them per locale", () => {
    const now = new Date("2026-10-29T12:00:00+04:00");
    expect(yearsSince(2019, now)).toBe(7);
    expect(yearsSince(2026, now)).toBe(0);
    const ru = {
      zero: "Первый год",
      one: "{count} год",
      few: "{count} года",
      many: "{count} лет",
      other: "{count} года",
    };
    expect(plural("ru", 1, ru)).toBe("1 год");
    expect(plural("ru", 3, ru)).toBe("3 года");
    expect(plural("ru", 7, ru)).toBe("7 лет");
    expect(plural("ru", 0, ru)).toBe("Первый год");
    expect(plural("en", 1, { one: "{count} year", other: "{count} years" })).toBe("1 year");
  });
});

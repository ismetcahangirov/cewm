import { randomUUID } from "node:crypto";

import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { logos, media, posts, projectImages, projects } from "@/lib/db/schema";
import {
  filterProjects,
  formatPostDate,
  postsPerPage,
  projectTypeFromQuery,
  queryLogosByGroup,
  queryPostBySlug,
  queryPosts,
  queryProjects,
  queryRelatedPosts,
} from "@/lib/public/content";

const run = randomUUID().slice(0, 8);
const created = {
  media: [] as string[],
  projects: [] as string[],
  posts: [] as string[],
  logos: [] as string[],
};

async function makeMedia(name: string, width: number | null = 1200, height: number | null = 800) {
  const [row] = await getDb()
    .insert(media)
    .values({
      key: `test/${run}/${name}.jpg`,
      mimeType: "image/jpeg",
      width,
      height,
      size: 1000,
      sha256: `${run}-${name}`,
      alt: { az: `Alt ${name}`, en: `Alt en ${name}` },
    })
    .returning();
  created.media.push(row.id);
  return row;
}

async function makeProject(
  name: string,
  values: Partial<typeof projects.$inferInsert> = {},
): Promise<string> {
  const [row] = await getDb()
    .insert(projects)
    .values({
      slug: { az: `${run}-${name}` },
      title: { az: `Layihə ${name}`, en: `Project ${name}` },
      status: "published",
      ...values,
    })
    .returning({ id: projects.id });
  created.projects.push(row.id);
  return row.id;
}

async function makePost(
  name: string,
  values: Partial<typeof posts.$inferInsert> = {},
): Promise<string> {
  const [row] = await getDb()
    .insert(posts)
    .values({
      slug: { az: `${run}-${name}` },
      title: { az: `Yazı ${name}` },
      status: "published",
      publishedAt: new Date(Date.now() - 86_400_000),
      ...values,
    })
    .returning({ id: posts.id });
  created.posts.push(row.id);
  return row.id;
}

async function makeLogo(
  name: string,
  imageId: string,
  values: Partial<typeof logos.$inferInsert> = {},
): Promise<string> {
  const [row] = await getDb()
    .insert(logos)
    .values({ name: `${run}-${name}`, imageId, group: "partners", ...values })
    .returning({ id: logos.id });
  created.logos.push(row.id);
  return row.id;
}

afterAll(async () => {
  const db = getDb();
  if (created.logos.length) await db.delete(logos).where(inArray(logos.id, created.logos));
  if (created.posts.length) await db.delete(posts).where(inArray(posts.id, created.posts));
  if (created.projects.length) {
    await db.delete(projects).where(inArray(projects.id, created.projects));
  }
  if (created.media.length) await db.delete(media).where(inArray(media.id, created.media));
});

describe("projects list", () => {
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    const cover = await makeMedia("cover");
    const second = await makeMedia("second");
    const first = await makeMedia("first");
    ids.late = await makeProject("late", { coverId: cover.id, sortOrder: 2 });
    ids.visual = await makeProject("visual", {
      coverId: second.id,
      type: "3d-visual",
      sortOrder: 1,
    });
    ids.gallery = await makeProject("gallery", { sortOrder: 0 });
    await getDb()
      .insert(projectImages)
      .values([
        { projectId: ids.gallery, mediaId: second.id, position: 1 },
        { projectId: ids.gallery, mediaId: first.id, position: 0 },
      ]);
    ids.draft = await makeProject("draft", { coverId: cover.id, status: "draft" });
    ids.bare = await makeProject("bare", { sortOrder: 3 });
  });

  it("lists published projects in order with a cover or the first gallery image", async () => {
    const items = (await queryProjects("az")).filter((item) =>
      Object.values(ids).includes(item.id),
    );
    expect(items.map((item) => item.id)).toEqual([ids.gallery, ids.visual, ids.late]);
    expect(items[0].image.src).toBe(`/media/test/${run}/first.jpg`);
    expect(items[1]).toMatchObject({ isVisual: true, type: "3d-visual" });
    expect(items[2].href).toBe(`/layiheler/${run}-late`);
  });

  it("localizes titles and falls back to az", async () => {
    const items = await queryProjects("en");
    const visual = items.find((item) => item.id === ids.visual);
    expect(visual?.title).toBe("Project visual");
    expect(visual?.image.alt).toBe("Alt en second");
    const ru = await queryProjects("ru");
    expect(ru.find((item) => item.id === ids.visual)?.title).toBe("Layihə visual");
  });

  it("filters by type", async () => {
    const items = (await queryProjects("az")).filter((item) =>
      Object.values(ids).includes(item.id),
    );
    expect(filterProjects(items, "3d-visual").map((item) => item.id)).toEqual([ids.visual]);
    expect(filterProjects(items, "completed").map((item) => item.id)).toEqual([
      ids.gallery,
      ids.late,
    ]);
    expect(filterProjects(items, null)).toHaveLength(3);
  });

  it("maps the query parameter to a type", () => {
    expect(projectTypeFromQuery("tamamlanmis")).toBe("completed");
    expect(projectTypeFromQuery("3d")).toBe("3d-visual");
    expect(projectTypeFromQuery("x")).toBeNull();
    expect(projectTypeFromQuery(undefined)).toBeNull();
    expect(projectTypeFromQuery(["3d"])).toBeNull();
  });
});

describe("posts", () => {
  const ids: Record<string, string> = {};
  const day = 86_400_000;

  beforeAll(async () => {
    const cover = await makeMedia("post-cover");
    ids.old = await makePost("old", { publishedAt: new Date(Date.now() - 10 * day) });
    ids.recent = await makePost("recent", {
      publishedAt: new Date(Date.now() - day),
      coverId: cover.id,
      slug: { az: `${run}-recent`, ru: `${run}-recent-ru`, en: `${run}-recent-en` },
      title: { az: "Yeni yazı", ru: "Новая запись" },
      excerpt: { az: "Qısa xülasə" },
    });
    ids.middle = await makePost("middle", { publishedAt: new Date(Date.now() - 5 * day) });
    ids.future = await makePost("future", { publishedAt: new Date(Date.now() + 7 * day) });
    ids.draft = await makePost("draft", { status: "draft" });
    ids.noDate = await makePost("nodate", { publishedAt: null });
  });

  const mine = (items: { id: string }[]) =>
    items.filter((item) => Object.values(ids).includes(item.id)).map((item) => item.id);

  it("returns only published posts that are already due, newest first", async () => {
    const { items } = await queryPosts("az", 1);
    expect(mine(items)).toEqual([ids.recent, ids.middle, ids.old]);
  });

  it("counts only visible posts", async () => {
    const { items, total } = await queryPosts("az", 1);
    expect(total).toBe(items.length);
    expect(total).toBeGreaterThanOrEqual(3);
  });

  it("builds localized cards", async () => {
    const { items } = await queryPosts("ru", 1);
    const card = items.find((item) => item.id === ids.recent);
    expect(card).toMatchObject({
      title: "Новая запись",
      href: `/ru/bloq/${run}-recent-ru`,
      excerpt: "Qısa xülasə",
    });
    expect(card?.image?.src).toBe(`/media/test/${run}/post-cover.jpg`);
    expect(items.find((item) => item.id === ids.old)?.image).toBeNull();
  });

  it("limits a page to the page size and grows by whole pages", async () => {
    const first = await queryPosts("az", 1);
    expect(first.items.length).toBeLessThanOrEqual(postsPerPage);
    const second = await queryPosts("az", 2);
    expect(second.items.length).toBeGreaterThanOrEqual(first.items.length);
  });

  it("looks a post up by slug in any locale, with az as fallback", async () => {
    expect((await queryPostBySlug("az", `${run}-recent`))?.id).toBe(ids.recent);
    expect((await queryPostBySlug("ru", `${run}-recent-ru`))?.id).toBe(ids.recent);
    expect((await queryPostBySlug("ru", `${run}-recent`))?.id).toBe(ids.recent);
    expect((await queryPostBySlug("en", `${run}-old`))?.id).toBe(ids.old);
    expect(await queryPostBySlug("az", `${run}-missing`)).toBeNull();
  });

  it("does not resolve drafts, future posts or posts without a date", async () => {
    expect(await queryPostBySlug("az", `${run}-draft`)).toBeNull();
    expect(await queryPostBySlug("az", `${run}-future`)).toBeNull();
    expect(await queryPostBySlug("az", `${run}-nodate`)).toBeNull();
  });

  it("picks at most three newest other posts as related", async () => {
    const related = await queryRelatedPosts("az", ids.recent);
    expect(related.length).toBeLessThanOrEqual(3);
    expect(related.map((item) => item.id)).not.toContain(ids.recent);
    expect(related.map((item) => item.id)).not.toContain(ids.future);
    expect(related.map((item) => item.id)).not.toContain(ids.draft);
    expect(mine(related)).toEqual([ids.middle, ids.old]);
  });

  it("formats dates per locale", () => {
    const iso = "2026-03-05T10:00:00.000Z";
    expect(formatPostDate(iso, "en")).toBe("March 5, 2026");
    expect(formatPostDate(iso, "ru")).toContain("2026");
    expect(formatPostDate(iso, "az")).toContain("2026");
  });
});

describe("logos by group", () => {
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    const image = await makeMedia("logo");
    const broken = await makeMedia("logo-broken", null, null);
    ids.second = await makeLogo("b-second", image.id, { sortOrder: 2 });
    ids.first = await makeLogo("a-first", image.id, { sortOrder: 1, url: "https://example.com" });
    ids.reference = await makeLogo("ref", image.id, { group: "references" });
    ids.inactive = await makeLogo("inactive", image.id, { isActive: false });
    ids.broken = await makeLogo("broken", broken.id);
  });

  const mine = (items: { id: string }[]) =>
    items.filter((item) => Object.values(ids).includes(item.id)).map((item) => item.id);

  it("returns active logos of one group in sort order", async () => {
    const partners = await queryLogosByGroup("az", "partners");
    expect(mine(partners)).toEqual([ids.first, ids.second]);
    expect(partners.find((item) => item.id === ids.first)).toMatchObject({
      name: `${run}-a-first`,
      url: "https://example.com",
    });
    expect(mine(await queryLogosByGroup("az", "references"))).toEqual([ids.reference]);
  });
});

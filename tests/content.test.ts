import { createHash, randomBytes } from "node:crypto";

import { eq, inArray, isNotNull } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db";
import { media, pages, posts, projects } from "@/lib/db/schema";
import type { RichTextDoc } from "@/lib/content/rich-text";
import type { PageDetailDto, PageInput, PageListItemDto } from "@/lib/validation/pages";
import type { PostDetailDto, PostInput, PostListItemDto } from "@/lib/validation/posts";
import type { ProjectDetailDto, ProjectInput, ProjectListItemDto } from "@/lib/validation/projects";
import type { SlugCheckResult } from "@/lib/validation/slugs";

import { call, createUser, removeUsers, sessionCookie, testRun } from "./support/admin";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

const { run, domain, password } = testRun();
const created = {
  pages: new Set<string>(),
  posts: new Set<string>(),
  projects: new Set<string>(),
  media: new Set<string>(),
};

let owner = "";
let editor = "";

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function revalidated(): string[] {
  return vi.mocked(revalidateTag).mock.calls.map(([tag]) => tag);
}

async function insertImage(name: string): Promise<string> {
  const sha256 = createHash("sha256").update(randomBytes(16)).digest("hex");
  const [row] = await getDb()
    .insert(media)
    .values({
      key: `uploads/2026/10/test-${run}-${name}.png`,
      mimeType: "image/png",
      width: 64,
      height: 48,
      size: 128,
      sha256,
      alt: null,
    })
    .returning({ id: media.id });
  if (!row) throw new Error("Media was not created");
  created.media.add(row.id);
  return row.id;
}

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

const tableDoc: RichTextDoc = {
  type: "doc",
  content: [
    { type: "blockquote", content: [paragraph("Ofis üçün sakit iş yeri.")] },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [paragraph("Model")] },
            { type: "tableHeader", content: [paragraph("Ölçü")] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [paragraph("MLIK-020")] },
            { type: "tableCell", content: [paragraph("120 x 60")] },
          ],
        },
      ],
    },
  ],
};

function pageInput(overrides: Partial<PageInput> = {}): PageInput {
  return {
    title: { az: `Test səhifə ${run}`, ru: "", en: "" },
    slug: { az: `test-sehife-${run}`, ru: "", en: "" },
    content: null,
    coverId: null,
    status: "draft",
    seoTitle: null,
    seoDescription: null,
    ...overrides,
  };
}

async function createPage(input: PageInput): Promise<string> {
  const response = await call("/api/admin/pages", "POST", { cookie: owner, body: input });
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(201);
  const { id } = await json<{ id: string }>(response);
  created.pages.add(id);
  return id;
}

function postInput(overrides: Partial<PostInput> = {}): PostInput {
  return {
    title: { az: `Test yazı ${run}`, ru: "", en: "" },
    slug: { az: `test-yazi-${run}`, ru: "", en: "" },
    excerpt: null,
    content: null,
    coverId: null,
    status: "draft",
    publishedAt: null,
    seoTitle: null,
    seoDescription: null,
    ...overrides,
  };
}

async function createPost(input: PostInput): Promise<string> {
  const response = await call("/api/admin/posts", "POST", { cookie: editor, body: input });
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(201);
  const { id } = await json<{ id: string }>(response);
  created.posts.add(id);
  return id;
}

async function listPosts(query: string): Promise<PostListItemDto[]> {
  const response = await call("/api/admin/posts", "GET", {
    cookie: owner,
    path: `/api/admin/posts?${query}`,
  });
  expect(response.status).toBe(200);
  return (await json<{ rows: PostListItemDto[] }>(response)).rows;
}

function projectInput(overrides: Partial<ProjectInput> = {}): ProjectInput {
  return {
    title: { az: `Test layihə ${run}`, ru: "", en: "" },
    slug: { az: `test-layihe-${run}`, ru: "", en: "" },
    excerpt: null,
    body: null,
    clientName: "Test MMC",
    type: "completed",
    coverId: null,
    images: [],
    status: "draft",
    seoTitle: null,
    seoDescription: null,
    ...overrides,
  };
}

async function createProject(input: ProjectInput): Promise<string> {
  const response = await call("/api/admin/projects", "POST", { cookie: owner, body: input });
  expect(response.status, JSON.stringify(await response.clone().json())).toBe(201);
  const { id } = await json<{ id: string }>(response);
  created.projects.add(id);
  return id;
}

async function getProject(id: string): Promise<ProjectDetailDto> {
  const response = await call("/api/admin/projects/[id]", "GET", { cookie: owner, params: { id } });
  expect(response.status).toBe(200);
  return json<ProjectDetailDto>(response);
}

beforeAll(async () => {
  const ownerUser = await createUser("owner", domain, password);
  const editorUser = await createUser("editor", domain, password);
  owner = await sessionCookie(ownerUser.email, password);
  editor = await sessionCookie(editorUser.email, password);
});

beforeEach(() => {
  vi.mocked(revalidateTag).mockClear();
});

afterAll(async () => {
  const db = getDb();
  if (created.projects.size) {
    await db.delete(projects).where(inArray(projects.id, [...created.projects]));
  }
  if (created.posts.size) await db.delete(posts).where(inArray(posts.id, [...created.posts]));
  if (created.pages.size) await db.delete(pages).where(inArray(pages.id, [...created.pages]));
  if (created.media.size) await db.delete(media).where(inArray(media.id, [...created.media]));
  await removeUsers(domain);
});

describe("pages", () => {
  it("creates, updates and deletes a free page", async () => {
    const id = await createPage(pageInput());
    expect(revalidated()).toEqual(expect.arrayContaining(["content", "menus"]));

    const list = await call("/api/admin/pages", "GET", {
      cookie: owner,
      path: `/api/admin/pages?search=${run}`,
    });
    const rows = (await json<{ rows: PageListItemDto[] }>(list)).rows;
    expect(rows).toEqual([
      expect.objectContaining({
        id,
        kind: null,
        slug: expect.objectContaining({ az: `test-sehife-${run}` }),
        status: "draft",
      }),
    ]);

    vi.mocked(revalidateTag).mockClear();
    const update = await call("/api/admin/pages/[id]", "PUT", {
      cookie: editor,
      params: { id },
      body: pageInput({
        title: { az: `Zəmanət ${run}`, ru: `Гарантия ${run}`, en: "" },
        status: "published",
      }),
    });
    expect(update.status).toBe(200);
    expect(revalidated()).toEqual(expect.arrayContaining(["content", "menus"]));
    const detail = await json<PageDetailDto>(
      await call("/api/admin/pages/[id]", "GET", { cookie: owner, params: { id } }),
    );
    expect(detail).toMatchObject({
      title: { az: `Zəmanət ${run}`, ru: `Гарантия ${run}`, en: null },
      status: "published",
      kind: null,
    });

    vi.mocked(revalidateTag).mockClear();
    const removed = await call("/api/admin/pages/[id]", "DELETE", {
      cookie: editor,
      params: { id },
    });
    expect(removed.status).toBe(204);
    created.pages.delete(id);
    expect(revalidated()).toEqual(expect.arrayContaining(["content", "menus"]));
    const gone = await call("/api/admin/pages/[id]", "GET", { cookie: owner, params: { id } });
    expect(gone.status).toBe(404);
  });

  it("rejects a slug that belongs to a site section", async () => {
    const response = await call("/api/admin/pages", "POST", {
      cookie: owner,
      body: pageInput({ slug: { az: "mehsullar", ru: "bloq", en: "" } }),
    });
    expect(response.status).toBe(400);
    const body = await json<{ fields: Record<string, string> }>(response);
    expect(body.fields).toHaveProperty("slug.az");
    expect(body.fields).toHaveProperty("slug.ru");
    expect(revalidated()).toEqual([]);

    const check = await call("/api/admin/slugs", "GET", {
      cookie: owner,
      path: "/api/admin/slugs?entity=page&slug=layiheler",
    });
    expect(await json<SlugCheckResult>(check)).toEqual({
      available: false,
      suggestion: "layiheler-2",
    });
  });

  it("refuses to delete a system page", async () => {
    const db = getDb();
    let [system] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(isNotNull(pages.kind))
      .limit(1);
    if (!system) {
      [system] = await db
        .insert(pages)
        .values({
          kind: "about",
          title: { az: "Haqqımızda" },
          slug: { az: `haqqimizda-${run}` },
          status: "draft",
        })
        .returning({ id: pages.id });
      if (system) created.pages.add(system.id);
    }
    if (!system) throw new Error("No system page");

    const response = await call("/api/admin/pages/[id]", "DELETE", {
      cookie: owner,
      params: { id: system.id },
    });
    expect(response.status).toBe(409);
    expect(revalidated()).toEqual([]);
    const [still] = await db.select({ id: pages.id }).from(pages).where(eq(pages.id, system.id));
    expect(still).toBeDefined();
  });

  it("answers 409 on the right locale field for a duplicate slug", async () => {
    await createPage(pageInput({ slug: { az: `birinci-${run}`, ru: `obshchiy-${run}`, en: "" } }));
    const response = await call("/api/admin/pages", "POST", {
      cookie: owner,
      body: pageInput({
        title: { az: `İkinci ${run}`, ru: "", en: "" },
        slug: { az: `ikinci-${run}`, ru: `obshchiy-${run}`, en: "" },
      }),
    });
    expect(response.status).toBe(409);
    const body = await json<{ fields: Record<string, string> }>(response);
    expect(Object.keys(body.fields)).toEqual(["slug.ru"]);
  });

  it("accepts a table and a quote in rich text and rejects unknown nodes", async () => {
    const id = await createPage(
      pageInput({
        slug: { az: `cedvel-${run}`, ru: "", en: "" },
        content: { az: tableDoc, ru: null, en: null },
      }),
    );
    const detail = await json<PageDetailDto>(
      await call("/api/admin/pages/[id]", "GET", { cookie: owner, params: { id } }),
    );
    expect(detail.content?.az).toEqual(tableDoc);

    const rejected = await call("/api/admin/pages", "POST", {
      cookie: owner,
      body: pageInput({
        slug: { az: `iframe-${run}`, ru: "", en: "" },
        content: {
          az: { type: "doc", content: [{ type: "iframe", attrs: { src: "https://x.test" } }] },
          ru: null,
          en: null,
        },
      }),
    });
    expect(rejected.status).toBe(400);
    expect(Object.keys((await json<{ fields: Record<string, string> }>(rejected)).fields)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^content\.az/)]),
    );
  });
});

describe("posts", () => {
  it("lists a post with a future date as scheduled", async () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const scheduled = await createPost(
      postInput({ status: "published", publishedAt: future, content: { az: tableDoc } }),
    );
    expect(revalidated()).toContain("content");
    const now = await createPost(
      postInput({
        title: { az: `İndi ${run}`, ru: "", en: "" },
        slug: { az: `indi-${run}`, ru: "", en: "" },
        status: "published",
      }),
    );

    const inScheduled = await listPosts(`status=scheduled&search=${run}`);
    expect(inScheduled.map((post) => post.id)).toEqual([scheduled]);
    expect(inScheduled[0]).toMatchObject({ state: "scheduled", publishedAt: future });

    const inPublished = await listPosts(`status=published&search=${run}`);
    expect(inPublished.map((post) => post.id)).toEqual([now]);
    expect(inPublished[0]?.publishedAt).not.toBeNull();

    vi.mocked(revalidateTag).mockClear();
    const draft = await call("/api/admin/posts/[id]", "PUT", {
      cookie: editor,
      params: { id: scheduled },
      body: postInput({ status: "draft", publishedAt: future }),
    });
    expect(draft.status).toBe(200);
    expect(revalidated()).toContain("content");
    const detail = await json<PostDetailDto>(
      await call("/api/admin/posts/[id]", "GET", { cookie: owner, params: { id: scheduled } }),
    );
    expect(detail.state).toBe("draft");

    vi.mocked(revalidateTag).mockClear();
    const removed = await call("/api/admin/posts/[id]", "DELETE", {
      cookie: owner,
      params: { id: scheduled },
    });
    expect(removed.status).toBe(204);
    created.posts.delete(scheduled);
    expect(revalidated()).toContain("content");
  });

  it("rejects a publish date without a time zone", async () => {
    const response = await call("/api/admin/posts", "POST", {
      cookie: owner,
      body: postInput({ slug: { az: `tarix-${run}` }, publishedAt: "2026-11-01T10:00" }),
    });
    expect(response.status).toBe(400);
    expect((await json<{ fields: Record<string, string> }>(response)).fields).toHaveProperty(
      "publishedAt",
    );
  });
});

describe("projects", () => {
  it("keeps gallery order and captions after reordering the images", async () => {
    const first = await insertImage("first");
    const second = await insertImage("second");
    const id = await createProject(
      projectInput({
        type: "3d-visual",
        images: [
          {
            mediaId: first,
            alt: { az: "Ofis planı" },
            caption: { az: "Birinci mərtəbə", ru: "Первый этаж" },
          },
          { mediaId: second, alt: { az: "Divan" }, caption: { az: "", ru: "Диван" } },
        ],
      }),
    );
    expect(revalidated()).toEqual(expect.arrayContaining(["content", "menus"]));

    const before = await getProject(id);
    expect(before.images).toEqual([
      {
        mediaId: first,
        alt: { az: "Ofis planı", ru: null, en: null },
        caption: { az: "Birinci mərtəbə", ru: "Первый этаж", en: null },
      },
      {
        mediaId: second,
        alt: { az: "Divan", ru: null, en: null },
        caption: { az: "", ru: "Диван", en: null },
      },
    ]);

    vi.mocked(revalidateTag).mockClear();
    const update = await call("/api/admin/projects/[id]", "PUT", {
      cookie: editor,
      params: { id },
      body: projectInput({
        type: "3d-visual",
        coverId: second,
        images: [...before.images].reverse(),
      }),
    });
    expect(update.status, JSON.stringify(await update.clone().json())).toBe(200);
    expect(revalidated()).toEqual(expect.arrayContaining(["content", "menus"]));

    const after = await getProject(id);
    expect(after.images.map((image) => image.mediaId)).toEqual([second, first]);
    expect(after.images[0]?.caption).toEqual({ az: "", ru: "Диван", en: null });
    expect(after.images[1]?.caption).toEqual({
      az: "Birinci mərtəbə",
      ru: "Первый этаж",
      en: null,
    });
    expect(after.coverId).toBe(second);
    expect(after.type).toBe("3d-visual");
  });

  it("uses the first gallery image as the cover when none is chosen", async () => {
    const image = await insertImage("cover");
    await createProject(
      projectInput({
        title: { az: `Örtük ${run}` },
        slug: { az: `ortuk-${run}` },
        images: [{ mediaId: image, alt: { az: "Qəbul zalı" }, caption: null }],
      }),
    );
    const response = await call("/api/admin/projects", "GET", {
      cookie: owner,
      path: `/api/admin/projects?search=${encodeURIComponent(`Örtük ${run}`)}`,
    });
    const rows = (await json<{ rows: ProjectListItemDto[] }>(response)).rows;
    expect(rows[0]?.cover?.src).toBe(`/media/uploads/2026/10/test-${run}-cover.png`);
  });

  it("reorders projects for the site and refuses a stale list", async () => {
    const extra = await createProject(
      projectInput({ title: { az: `Sıra ${run}` }, slug: { az: `sira-${run}` } }),
    );
    const orderResponse = await call("/api/admin/projects/reorder", "GET", { cookie: owner });
    const original = (await json<ProjectListItemDto[]>(orderResponse)).map((item) => item.id);
    expect(original.at(-1)).toBe(extra);

    const reordered = [extra, ...original.filter((projectId) => projectId !== extra)];
    vi.mocked(revalidateTag).mockClear();
    const response = await call("/api/admin/projects/reorder", "POST", {
      cookie: editor,
      body: { orderedIds: reordered },
    });
    expect(response.status).toBe(204);
    expect(revalidated()).toEqual(expect.arrayContaining(["content", "menus"]));

    const list = await call("/api/admin/projects", "GET", {
      cookie: owner,
      path: "/api/admin/projects?sort=sortOrder&order=asc&pageSize=50",
    });
    const rows = (await json<{ rows: ProjectListItemDto[] }>(list)).rows;
    expect(rows[0]?.id).toBe(extra);

    const stale = await call("/api/admin/projects/reorder", "POST", {
      cookie: owner,
      body: { orderedIds: reordered.slice(1) },
    });
    expect(stale.status).toBe(409);

    const restore = await call("/api/admin/projects/reorder", "POST", {
      cookie: owner,
      body: { orderedIds: original },
    });
    expect(restore.status).toBe(204);
  });

  it("deletes a project", async () => {
    const id = await createProject(
      projectInput({ title: { az: `Silinən ${run}` }, slug: { az: `silinen-${run}` } }),
    );
    vi.mocked(revalidateTag).mockClear();
    const response = await call("/api/admin/projects/[id]", "DELETE", {
      cookie: owner,
      params: { id },
    });
    expect(response.status).toBe(204);
    created.projects.delete(id);
    expect(revalidated()).toEqual(expect.arrayContaining(["content", "menus"]));
    const gone = await call("/api/admin/projects/[id]", "GET", { cookie: owner, params: { id } });
    expect(gone.status).toBe(404);
  });
});

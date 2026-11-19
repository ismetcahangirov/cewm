import { randomUUID } from "node:crypto";

import { eq, inArray, like } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  flattenItems,
  indentItem,
  itemAtPath,
  moveSibling,
  outdentItem,
  projectDrop,
  type EditorItem,
} from "@/lib/admin/menu-tree";
import { getDb } from "@/lib/db";
import { categories, clientLogos, media, menuItems, menus, pages } from "@/lib/db/schema";
import { buildMenuTree, type MenuSourceRow } from "@/lib/public/menus";
import type { ClientLogoDto } from "@/lib/validation/client-logos";
import {
  isMenuUrl,
  mainMenuKey,
  menuMaxDepth,
  type MenuDetailDto,
  type MenuItemInput,
  type MenuSummaryDto,
  type MenuTargetsDto,
} from "@/lib/validation/menus";

import { call, createUser, removeUsers, sessionCookie, testRun } from "./support/admin";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
}));

const { run, domain, password } = testRun();
const created = {
  logos: new Set<string>(),
  categories: [] as string[],
  pages: [] as string[],
};

let owner = "";
let imageId = "";
let navMenuId = "";
let activeCategory = "";
let hiddenCategory = "";
let publishedPage = "";
let draftPage = "";

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function item(
  fields: Omit<Partial<MenuItemInput>, "label"> & { label?: string } = {},
): MenuItemInput {
  const { label, ...rest } = fields;
  return { label: { az: label ?? `Element ${run}` }, target: "none", ...rest };
}

async function saveMenu(id: string, items: MenuItemInput[], title = `Test ${run}`) {
  return call("/api/admin/menus/[id]", "PUT", {
    cookie: owner,
    params: { id },
    body: { title: { az: title }, items },
  });
}

async function fields(response: Response): Promise<Record<string, string>> {
  return (await json<{ fields?: Record<string, string> }>(response)).fields ?? {};
}

function expectRevalidated(tag: string) {
  expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith(tag, { expire: 0 });
}

beforeAll(async () => {
  const db = getDb();
  const user = await createUser("owner", domain, password);
  owner = await sessionCookie(user.email, password);

  const [image] = await db
    .insert(media)
    .values({
      key: `tests/${run}/logo.svg`,
      mimeType: "image/svg+xml",
      size: 120,
      sha256: `test-${run}`,
    })
    .returning({ id: media.id });
  imageId = image?.id ?? "";

  const insertedCategories = await db
    .insert(categories)
    .values([
      {
        name: { az: `Aktiv ${run}`, ru: `Aktiv ru ${run}` },
        slug: { az: `aktiv-${run}`, ru: `aktiv-ru-${run}` },
        isActive: true,
      },
      { name: { az: `Gizli ${run}` }, slug: { az: `gizli-${run}` }, isActive: false },
    ])
    .returning({ id: categories.id });
  created.categories = insertedCategories.map((row) => row.id);
  [activeCategory = "", hiddenCategory = ""] = created.categories;

  const insertedPages = await db
    .insert(pages)
    .values([
      { title: { az: `Dərc ${run}` }, slug: { az: `derc-${run}` }, status: "published" },
      { title: { az: `Qaralama ${run}` }, slug: { az: `qaralama-${run}` }, status: "draft" },
    ])
    .returning({ id: pages.id });
  created.pages = insertedPages.map((row) => row.id);
  [publishedPage = "", draftPage = ""] = created.pages;

  const [navMenu] = await db
    .insert(menus)
    .values({ key: `nav-test-${run}`, title: { az: `Test ${run}` }, sortOrder: 900 })
    .returning({ id: menus.id });
  navMenuId = navMenu?.id ?? "";
});

beforeEach(() => {
  vi.mocked(revalidateTag).mockClear();
});

afterAll(async () => {
  const db = getDb();
  await db.delete(menus).where(like(menus.key, `%${run}%`));
  if (created.logos.size) {
    await db.delete(clientLogos).where(inArray(clientLogos.id, [...created.logos]));
  }
  if (imageId) await db.delete(media).where(eq(media.id, imageId));
  if (created.categories.length) {
    await db.delete(categories).where(inArray(categories.id, created.categories));
  }
  if (created.pages.length) await db.delete(pages).where(inArray(pages.id, created.pages));
  await removeUsers(domain);
});

describe("menu rules", () => {
  it("allows three levels in the main menu and one in footer columns", () => {
    expect(menuMaxDepth(mainMenuKey)).toBe(3);
    expect(menuMaxDepth("footer-products")).toBe(1);
  });

  it("accepts https, site paths, tel and mailto links only", () => {
    for (const value of [
      "https://cewm.az/kataloq",
      "/bloq",
      "/",
      "tel:+994 12 555 55 55",
      "mailto:info@cewm.az",
    ]) {
      expect(isMenuUrl(value), value).toBe(true);
    }
    for (const value of [
      "http://cewm.az",
      "//evil.example",
      "javascript:alert(1)",
      "cewm.az",
      "https://",
      "/with space",
      "tel:abc",
      "mailto:nobody",
    ]) {
      expect(isMenuUrl(value), value).toBe(false);
    }
  });
});

describe("menus API", () => {
  let footer: MenuSummaryDto;

  it("creates a footer column with a generated key", async () => {
    const response = await call("/api/admin/menus", "POST", {
      cookie: owner,
      body: { title: { az: `Test sütun ${run}` } },
    });
    expect(response.status).toBe(201);
    footer = await json<MenuSummaryDto>(response);
    expect(footer.key).toBe(`footer-test-sutun-${run}`);
    expectRevalidated("menus");

    const list = await json<MenuSummaryDto[]>(
      await call("/api/admin/menus", "GET", { cookie: owner }),
    );
    expect(list.map((menu) => menu.id)).toContain(footer.id);
  });

  it("saves a three-level tree and keeps ids stable on re-save", async () => {
    const response = await saveMenu(navMenuId, [
      item({
        label: "Məhsullar",
        children: [
          item({
            label: "Aktiv",
            target: "category",
            categoryId: activeCategory,
            pageId: publishedPage,
            children: [item({ label: "Xarici", target: "url", url: "https://example.com/a" })],
          }),
        ],
      }),
      item({ label: "Haqqımızda", target: "page", pageId: publishedPage }),
    ]);
    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
    expectRevalidated("menus");
    const saved = await json<MenuDetailDto>(response);
    const [root, page] = saved.items;
    const child = root?.children[0];
    const grandchild = child?.children[0];
    expect(root).toMatchObject({ label: { az: "Məhsullar" }, target: "none" });
    expect(child).toMatchObject({ target: "category", categoryId: activeCategory, pageId: null });
    expect(grandchild).toMatchObject({ target: "url", url: "https://example.com/a" });
    expect(page).toMatchObject({ target: "page", pageId: publishedPage });

    const again = await saveMenu(navMenuId, [
      item({ id: page?.id, label: "Haqqımızda yeni", target: "page", pageId: publishedPage }),
      item({
        id: root?.id,
        label: "Məhsullar",
        children: [
          item({ label: "Yeni", target: "url", url: "/bloq" }),
          item({
            id: grandchild?.id,
            label: "Xarici",
            target: "url",
            url: "https://example.com/b",
          }),
        ],
      }),
    ]);
    expect(again.status).toBe(200);
    const resaved = await json<MenuDetailDto>(again);
    expect(resaved.items.map((entry) => entry.id)).toEqual([page?.id, root?.id]);
    expect(resaved.items[0]?.label.az).toBe("Haqqımızda yeni");
    const children = resaved.items[1]?.children ?? [];
    expect(children).toHaveLength(2);
    expect(children[1]).toMatchObject({ id: grandchild?.id, url: "https://example.com/b" });
    expect(children[0]?.id).not.toBe(child?.id);

    const rows = await getDb()
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.menuId, navMenuId));
    expect(rows.map((row) => row.id)).not.toContain(child?.id);
    expect(rows).toHaveLength(4);
  });

  it("rejects a fourth level", async () => {
    const response = await saveMenu(navMenuId, [
      item({ children: [item({ children: [item({ children: [item()] })] })] }),
    ]);
    expect(response.status).toBe(400);
    expect(await fields(response)).toHaveProperty("items.0.children.0.children.0.children.0");
  });

  it("keeps footer columns one level deep", async () => {
    const response = await saveMenu(footer.id, [
      item({ target: "url", url: "/bloq", children: [item({ target: "url", url: "/" })] }),
    ]);
    expect(response.status).toBe(400);
    expect(await fields(response)).toHaveProperty("items.0.children.0");
  });

  it("rejects a target without its reference", async () => {
    const missingReference = await saveMenu(footer.id, [
      item({ target: "category", pageId: publishedPage }),
    ]);
    expect(missingReference.status).toBe(400);
    expect(await fields(missingReference)).toHaveProperty("items.0.categoryId");

    const unknown = await saveMenu(footer.id, [
      item({ target: "url", url: "/" }),
      item({ target: "page", pageId: randomUUID() }),
    ]);
    expect(unknown.status).toBe(400);
    expect(await fields(unknown)).toHaveProperty("items.1.pageId");
  });

  it("validates custom links", async () => {
    for (const url of ["javascript:alert(1)", "http://example.com", "//example.com", ""]) {
      const response = await saveMenu(footer.id, [item({ target: "url", url })]);
      expect(response.status, url).toBe(400);
      expect(await fields(response)).toHaveProperty("items.0.url");
    }
    const valid = await saveMenu(
      footer.id,
      [
        item({ label: "Zəng", target: "url", url: "tel:+994125555555" }),
        item({ label: "Yaz", target: "url", url: "mailto:info@cewm.az" }),
        item({ label: "Haqqımızda", target: "page", pageId: publishedPage }),
      ],
      `Yeni başlıq ${run}`,
    );
    expect(valid.status).toBe(200);
    const saved = await json<MenuDetailDto>(valid);
    expect(saved.title.az).toBe(`Yeni başlıq ${run}`);
    expect(saved.items).toHaveLength(3);
  });

  it("refuses ids that belong to another menu", async () => {
    const other = await json<MenuDetailDto>(
      await call("/api/admin/menus/[id]", "GET", { cookie: owner, params: { id: navMenuId } }),
    );
    const foreign = other.items[0]?.id;
    const response = await saveMenu(footer.id, [item({ id: foreign, target: "url", url: "/" })]);
    expect(response.status).toBe(409);
  });

  it("reorders footer columns and rejects a stale list", async () => {
    const second = await call("/api/admin/menus", "POST", {
      cookie: owner,
      body: { title: { az: `Ikinci sutun ${run}` } },
    });
    expect(second.status).toBe(201);
    const list = await json<MenuSummaryDto[]>(
      await call("/api/admin/menus", "GET", { cookie: owner }),
    );
    const original = list.filter((menu) => menu.key.startsWith("footer-")).map((menu) => menu.id);
    expect(original).toContain(footer.id);

    const stale = await call("/api/admin/menus/reorder", "POST", {
      cookie: owner,
      body: { orderedIds: original.filter((id) => id !== footer.id) },
    });
    expect(stale.status).toBe(409);

    const reordered = [footer.id, ...original.filter((id) => id !== footer.id)];
    const response = await call("/api/admin/menus/reorder", "POST", {
      cookie: owner,
      body: { orderedIds: reordered },
    });
    expect(response.status).toBe(204);
    expectRevalidated("menus");
    const after = await json<MenuSummaryDto[]>(
      await call("/api/admin/menus", "GET", { cookie: owner }),
    );
    expect(after.filter((menu) => menu.key.startsWith("footer-")).map((menu) => menu.id)).toEqual(
      reordered,
    );

    const restore = await call("/api/admin/menus/reorder", "POST", {
      cookie: owner,
      body: { orderedIds: original },
    });
    expect(restore.status).toBe(204);
  });

  it("refuses to delete the main menu and deletes a footer column", async () => {
    const [main] = await getDb().select().from(menus).where(eq(menus.key, mainMenuKey));
    if (main) {
      const refused = await call("/api/admin/menus/[id]", "DELETE", {
        cookie: owner,
        params: { id: main.id },
      });
      expect(refused.status).toBe(409);
      const [still] = await getDb().select().from(menus).where(eq(menus.id, main.id));
      expect(still).toBeDefined();
    }

    const response = await call("/api/admin/menus/[id]", "DELETE", {
      cookie: owner,
      params: { id: footer.id },
    });
    expect(response.status).toBe(204);
    expectRevalidated("menus");
    const items = await getDb()
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.menuId, footer.id));
    expect(items).toHaveLength(0);
    const gone = await call("/api/admin/menus/[id]", "GET", {
      cookie: owner,
      params: { id: footer.id },
    });
    expect(gone.status).toBe(404);
  });

  it("lists targets with their visibility", async () => {
    const response = await call("/api/admin/menus/targets", "GET", { cookie: owner });
    expect(response.status).toBe(200);
    const targets = await json<MenuTargetsDto>(response);
    expect(targets.categories).toContainEqual(
      expect.objectContaining({ id: hiddenCategory, isActive: false }),
    );
    expect(targets.pages).toContainEqual(
      expect.objectContaining({ id: draftPage, isPublished: false }),
    );
    expect(targets.pages).toContainEqual(
      expect.objectContaining({ id: publishedPage, isPublished: true }),
    );
  });

  it("expires the menus tag when a category changes", async () => {
    const response = await call("/api/admin/categories/[id]", "PATCH", {
      cookie: owner,
      params: { id: activeCategory },
      body: { isActive: true },
    });
    expect(response.status).toBe(204);
    expectRevalidated("menus");
    expectRevalidated("catalog");
  });
});

describe("client logos API", () => {
  async function createLogo(name: string, overrides: Record<string, unknown> = {}) {
    const response = await call("/api/admin/client-logos", "POST", {
      cookie: owner,
      body: { name, imageId, url: null, isActive: true, ...overrides },
    });
    if (response.status === 201) created.logos.add((await json<{ id: string }>(response)).id);
    return response;
  }

  async function referenceIds(): Promise<string[]> {
    const response = await call("/api/admin/client-logos", "GET", {
      cookie: owner,
    });
    expect(response.status).toBe(200);
    return (await json<ClientLogoDto[]>(response)).map((logo) => logo.id);
  }

  it("validates the link and the image", async () => {
    const badUrl = await createLogo(`Pis ${run}`, { url: "ftp://example.com" });
    expect(badUrl.status).toBe(400);
    expect(await fields(badUrl)).toHaveProperty("url");

    const noImage = await createLogo(`Şəkilsiz ${run}`, { imageId: randomUUID() });
    expect(noImage.status).toBe(400);
    expect(await fields(noImage)).toHaveProperty("imageId");
  });

  it("creates, edits, toggles, reorders and deletes logos", async () => {
    const first = await createLogo(`Birinci ${run}`, { url: "https://example.com" });
    expect(first.status).toBe(201);
    expectRevalidated("content");
    const second = await createLogo(`İkinci ${run}`);
    expect(second.status).toBe(201);
    const [firstId = "", secondId = ""] = [...created.logos];

    const updated = await call("/api/admin/client-logos/[id]", "PUT", {
      cookie: owner,
      params: { id: secondId },
      body: {
        name: `İkinci yeni ${run}`,
        imageId,
        url: "http://example.org",
        isActive: true,
      },
    });
    expect(updated.status).toBe(200);
    expectRevalidated("content");

    vi.mocked(revalidateTag).mockClear();
    const toggled = await call("/api/admin/client-logos/[id]", "PATCH", {
      cookie: owner,
      params: { id: firstId },
      body: { isActive: false },
    });
    expect(toggled.status).toBe(204);
    expectRevalidated("content");

    const original = await referenceIds();
    const list = await json<ClientLogoDto[]>(
      await call("/api/admin/client-logos", "GET", { cookie: owner }),
    );
    expect(list.find((logo) => logo.id === firstId)).toMatchObject({
      isActive: false,
      url: "https://example.com",
      image: expect.objectContaining({ id: imageId }),
    });
    expect(list.find((logo) => logo.id === secondId)).toMatchObject({
      name: `İkinci yeni ${run}`,
      url: "http://example.org",
    });

    const stale = await call("/api/admin/client-logos/reorder", "POST", {
      cookie: owner,
      body: { orderedIds: [secondId] },
    });
    expect(stale.status).toBe(409);

    vi.mocked(revalidateTag).mockClear();
    const reordered = [secondId, firstId, ...original.filter((id) => !created.logos.has(id))];
    const reorder = await call("/api/admin/client-logos/reorder", "POST", {
      cookie: owner,
      body: { orderedIds: reordered },
    });
    expect(reorder.status).toBe(204);
    expectRevalidated("content");
    expect(await referenceIds()).toEqual(reordered);

    vi.mocked(revalidateTag).mockClear();
    const removed = await call("/api/admin/client-logos/[id]", "DELETE", {
      cookie: owner,
      params: { id: firstId },
    });
    expect(removed.status).toBe(204);
    expectRevalidated("content");
    const [image] = await getDb().select().from(media).where(eq(media.id, imageId));
    expect(image).toBeDefined();
    const again = await call("/api/admin/client-logos/[id]", "DELETE", {
      cookie: owner,
      params: { id: firstId },
    });
    expect(again.status).toBe(404);
  });
});

describe("public menu tree", () => {
  const visibleCategory = { slug: { az: "rehber-destleri", ru: "rukovoditeli" }, visible: true };

  function row(fieldsOverride: Partial<MenuSourceRow> & { id: string }): MenuSourceRow {
    return {
      parentId: null,
      label: { az: fieldsOverride.id, ru: `${fieldsOverride.id}-ru` },
      target: "none",
      url: null,
      category: null,
      page: null,
      ...fieldsOverride,
    };
  }

  const rows: MenuSourceRow[] = [
    row({ id: "products" }),
    row({ id: "boss", parentId: "products", target: "category", category: visibleCategory }),
    row({
      id: "hidden",
      parentId: "products",
      target: "category",
      category: { slug: { az: "gizli" }, visible: false },
    }),
    row({
      id: "about",
      target: "page",
      page: { slug: { az: "haqqimizda" }, visible: true },
      label: { az: "Haqqımızda", en: "About" },
    }),
    row({ id: "draft", target: "page", page: { slug: { az: "qaralama" }, visible: false } }),
    row({ id: "projects", target: "url", url: "/bloq" }),
    row({ id: "external", target: "url", url: "https://example.com/x" }),
    row({ id: "empty-heading" }),
    row({ id: "broken-parent", target: "page", page: null }),
    row({ id: "broken-child", parentId: "broken-parent", target: "url", url: "tel:+994125555555" }),
  ];

  it("builds hrefs per locale with az fallback and skips hidden targets", () => {
    const az = buildMenuTree(rows, "az");
    expect(az.map((entry) => entry.id)).toEqual([
      "products",
      "about",
      "projects",
      "external",
      "broken-parent",
    ]);
    expect(az[0]).toMatchObject({
      href: null,
      children: [{ id: "boss", href: "/mehsullar/rehber-destleri", children: [] }],
    });
    expect(az[1]).toMatchObject({ label: "Haqqımızda", href: "/haqqimizda" });
    expect(az[2]?.href).toBe("/bloq");
    expect(az[3]?.href).toBe("https://example.com/x");
    expect(az[4]).toMatchObject({
      href: null,
      children: [{ id: "broken-child", href: "tel:+994125555555" }],
    });

    const ru = buildMenuTree(rows, "ru");
    expect(ru[0]?.label).toBe("products-ru");
    expect(ru[0]?.children[0]?.href).toBe("/ru/mehsullar/rukovoditeli");
    expect(ru[2]?.href).toBe("/ru/bloq");

    const en = buildMenuTree(rows, "en");
    expect(en[1]).toMatchObject({ label: "About", href: "/en/haqqimizda" });
    expect(en[0]?.label).toBe("products");
    expect(en[3]?.href).toBe("https://example.com/x");
  });

  it("returns plain serialisable data", () => {
    const tree = buildMenuTree(rows, "az");
    expect(JSON.parse(JSON.stringify(tree))).toEqual(tree);
  });
});

describe("menu editor tree", () => {
  function node(key: string, children: EditorItem[] = []): EditorItem {
    return {
      key,
      id: null,
      label: { az: key },
      target: "none",
      categoryId: null,
      pageId: null,
      url: null,
      children,
    };
  }

  const keys = (items: EditorItem[]): unknown[] =>
    items.map((entry) => (entry.children.length ? [entry.key, keys(entry.children)] : entry.key));

  it("indents, outdents and moves within siblings", () => {
    const tree = [node("a"), node("b"), node("c")];
    const indented = indentItem(tree, "b");
    expect(keys(indented)).toEqual([["a", ["b"]], "c"]);
    expect(keys(outdentItem(indented, "b"))).toEqual(["a", "b", "c"]);
    expect(keys(moveSibling(tree, "c", -1))).toEqual(["a", "c", "b"]);
  });

  it("keeps a dragged subtree inside the depth limit", () => {
    const tree = [node("a", [node("a1", [node("a2")])]), node("b", [node("b1")])];
    const visible = flattenItems(tree).filter((entry) => !["b1"].includes(entry.key));
    expect(projectDrop(visible, "b", "a2", 3, 2)).toBeNull();
    const flatRoot = flattenItems([node("x"), node("y", [node("y1")])]).filter(
      (entry) => entry.key !== "y1",
    );
    expect(projectDrop(flatRoot, "y", "y", 1, 2)).toEqual({ depth: 1, parentKey: "x" });
    expect(projectDrop(flatRoot, "y", "y", 1, 1)).toEqual({ depth: 0, parentKey: null });
  });

  it("maps a server field path to the item it belongs to", () => {
    const tree = [node("a", [node("a1"), node("a2")])];
    expect(itemAtPath(tree, "items.0.children.1.url")).toEqual({ key: "a2", field: "url" });
    expect(itemAtPath(tree, "items.0.children.0")).toEqual({ key: "a1", field: "" });
    expect(itemAtPath(tree, "items.3")).toBeNull();
  });
});

import { inArray, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { getDb } from "@/lib/db";
import { brands, categories, contactPersons, pages, settings } from "@/lib/db/schema";
import { seedBrands, seedCategories, seedContactPersons, seedDatabase } from "@/lib/db/seed";
import { locales } from "@/lib/i18n/config";

describe("database seed", () => {
  it("fills an empty database and can run again without duplicates", async () => {
    const db = getDb();
    const first = await seedDatabase(db);
    const again = await seedDatabase(db);
    expect(again).toMatchObject({
      brands: 0,
      categories: 0,
      contactPersons: 0,
      pages: 0,
      menus: 0,
    });

    const brandRows = await db
      .select({ name: brands.name })
      .from(brands)
      .where(
        inArray(
          brands.slug,
          seedBrands.map((brand) => brand.slug),
        ),
      );
    expect(brandRows.map((row) => row.name).sort()).toEqual(
      seedBrands.map((brand) => brand.name).sort(),
    );

    const categoryRows = await db
      .select({ name: categories.name, slug: categories.slug })
      .from(categories)
      .where(
        inArray(
          sql`${categories.slug} ->> 'az'`,
          seedCategories.map((category) => category.slug.az),
        ),
      );
    expect(categoryRows).toHaveLength(7);
    for (const row of categoryRows) {
      for (const locale of locales) {
        expect(row.name[locale], locale).toBeTruthy();
        expect(row.slug[locale], locale).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      }
    }

    const people = await db
      .select({ name: contactPersons.name, phones: contactPersons.phones })
      .from(contactPersons)
      .where(
        inArray(
          sql`${contactPersons.name} ->> 'az'`,
          seedContactPersons.map((person) => person.name.az),
        ),
      );
    expect(people).toHaveLength(seedContactPersons.length);

    const [row] = await db
      .select()
      .from(settings)
      .where(sql`${settings.id} = 1`);
    expect(row).toBeDefined();
    if (first.settings) expect(row?.address?.az).toContain("AZ1025");

    const [contact] = await db
      .select({ status: pages.status })
      .from(pages)
      .where(sql`${pages.kind} = 'contact'`);
    expect(contact).toBeDefined();
    if (first.pages) expect(contact?.status).toBe("published");
  });

  it("does not bring back starter categories the import or the admin renamed", async () => {
    const db = getDb();
    await seedDatabase(db);
    const original = await db
      .select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .where(
        inArray(
          sql`${categories.slug} ->> 'az'`,
          seedCategories.slice(0, 2).map((category) => category.slug.az),
        ),
      );
    expect(original).toHaveLength(2);
    const total = async () => {
      const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(categories);
      return row?.value ?? 0;
    };
    try {
      for (const row of original) {
        const slug = { ...row.slug };
        for (const locale of locales) slug[locale] = `renamed-${row.slug[locale] ?? locale}`;
        await db
          .update(categories)
          .set({ slug: { ...slug, az: `renamed-${row.slug.az}` } })
          .where(sql`${categories.id} = ${row.id}`);
      }
      const before = await total();
      expect((await seedDatabase(db)).categories).toBe(0);
      expect(await total()).toBe(before);
    } finally {
      for (const row of original) {
        await db
          .update(categories)
          .set({ slug: row.slug })
          .where(sql`${categories.id} = ${row.id}`);
      }
    }
  });
});

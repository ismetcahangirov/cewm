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
});

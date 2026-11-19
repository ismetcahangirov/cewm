import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type { Localized } from "../i18n/localized";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

export const seedBrands = [
  { name: "HOMAG", slug: "homag", websiteUrl: "https://www.homag.com" },
  { name: "LEUCO", slug: "leuco", websiteUrl: "https://www.leuco.com" },
  { name: "Saf Teknik", slug: "saf-teknik", websiteUrl: null },
  { name: "Scheuch", slug: "scheuch", websiteUrl: "https://www.scheuch.com" },
] as const;

export const seedCategories: { name: Localized; slug: Localized }[] = [
  {
    name: { az: "Kəsmə", ru: "Раскрой", en: "Cutting", de: "Zuschnitt" },
    slug: { az: "kesme", ru: "raskroj", en: "cutting", de: "zuschnitt" },
  },
  {
    name: {
      az: "Kənar örtmə",
      ru: "Облицовка кромок",
      en: "Edge banding",
      de: "Kantenanleimen",
    },
    slug: { az: "kenar-ortme", ru: "oblicovka-kromok", en: "edge-banding", de: "kantenanleimen" },
  },
  {
    name: {
      az: "CNC emal mərkəzləri",
      ru: "Обрабатывающие центры с ЧПУ",
      en: "CNC machining centres",
      de: "CNC-Bearbeitungszentren",
    },
    slug: {
      az: "cnc-emal-merkezleri",
      ru: "obrabatyvayushchie-centry-s-chpu",
      en: "cnc-machining-centres",
      de: "cnc-bearbeitungszentren",
    },
  },
  {
    name: {
      az: "Deşmə və şkant vurma",
      ru: "Сверление и забивка шкантов",
      en: "Drilling and dowel insertion",
      de: "Bohren und Dübeleintreiben",
    },
    slug: {
      az: "desme-ve-skant-vurma",
      ru: "sverlenie-i-zabivka-shkantov",
      en: "drilling-and-dowel-insertion",
      de: "bohren-und-duebeleintreiben",
    },
  },
  {
    name: {
      az: "Montaj texnologiyası",
      ru: "Технологии сборки",
      en: "Assembly technology",
      de: "Montagetechnik",
    },
    slug: {
      az: "montaj-texnologiyasi",
      ru: "tekhnologii-sborki",
      en: "assembly-technology",
      de: "montagetechnik",
    },
  },
  {
    name: {
      az: "Qablaşdırma texnologiyası",
      ru: "Упаковочная техника",
      en: "Packaging technology",
      de: "Verpackungstechnik",
    },
    slug: {
      az: "qablasdirma-texnologiyasi",
      ru: "upakovochnaya-tekhnika",
      en: "packaging-technology",
      de: "verpackungstechnik",
    },
  },
  {
    name: {
      az: "Proqram təminatı",
      ru: "Программное обеспечение",
      en: "Software",
      de: "Software",
    },
    slug: {
      az: "proqram-teminati",
      ru: "programmnoe-obespechenie",
      en: "software",
      de: "software",
    },
  },
];

export const seedContactPersons: {
  name: Localized;
  role: Localized;
  phones: string[];
  whatsapp: string | null;
}[] = [
  {
    name: { az: "Həsən Nəbiyev", ru: null, en: "Hasan Nabiyev", de: "Hasan Nabiyev" },
    role: { az: "Direktor", ru: "Директор", en: "Director", de: "Direktor" },
    phones: ["+994124800570", "+994557160366"],
    whatsapp: "+994557160366",
  },
  {
    name: { az: "İbrahim Bayramov", ru: null, en: "Ibrahim Bayramov", de: "Ibrahim Bayramov" },
    role: {
      az: "Satış meneceri",
      ru: "Менеджер по продажам",
      en: "Sales manager",
      de: "Vertriebsmanager",
    },
    phones: ["+994502050234"],
    whatsapp: null,
  },
];

const address: Localized = {
  az: "S. Vəzirov küç. 17A, AZ1025, Bakı",
  ru: "ул. С. Везирова 17A, AZ1025, Баку",
  en: "17A S. Vezirov Street, AZ1025, Baku",
  de: "S.-Vezirov-Straße 17A, AZ1025, Baku",
};

const contactPage = {
  kind: "contact" as const,
  title: { az: "Əlaqə", ru: "Контакты", en: "Contact", de: "Kontakt" },
  slug: { az: "elaqe", ru: "kontakty", en: "contact", de: "kontakt" },
};

const hero = {
  headline: {
    az: "Azərbaycanda HOMAG ağac emalı avadanlıqları",
    ru: "Деревообрабатывающее оборудование HOMAG в Азербайджане",
    en: "HOMAG woodworking machinery in Azerbaijan",
    de: "HOMAG-Holzbearbeitungsmaschinen in Aserbaidschan",
  },
  subline: null,
  ctaLabel: { az: "Məhsullar", ru: "Продукция", en: "Products", de: "Produkte" },
  ctaHref: "/mehsullar",
  filmId: null,
};

const mainMenu = [
  {
    label: { az: "Məhsullar", ru: "Продукция", en: "Products", de: "Produkte" },
    url: "/mehsullar",
  },
  { label: { az: "Bloq", ru: "Блог", en: "Blog", de: "Blog" }, url: "/bloq" },
];

export type SeedSummary = {
  settings: boolean;
  brands: number;
  categories: number;
  contactPersons: number;
  pages: number;
  menus: number;
};

export async function seedDatabase(db: Database): Promise<SeedSummary> {
  return db.transaction(async (tx) => {
    const settingsRows = await tx
      .insert(schema.settings)
      .values({
        id: 1,
        legalName: "CEWM",
        address,
        phones: [
          {
            label: { az: "Telefon", ru: "Телефон", en: "Phone", de: "Telefon" },
            number: "+994124800570",
          },
        ],
        hero,
      })
      .onConflictDoNothing()
      .returning({ id: schema.settings.id });

    const brandRows = await tx
      .insert(schema.brands)
      .values(seedBrands.map((brand, sortOrder) => ({ ...brand, sortOrder })))
      .onConflictDoNothing()
      .returning({ id: schema.brands.id });

    const categoryRows = await tx
      .insert(schema.categories)
      .values(seedCategories.map((category, sortOrder) => ({ ...category, sortOrder })))
      .onConflictDoNothing()
      .returning({ id: schema.categories.id });

    let contactPersons = 0;
    for (const [sortOrder, person] of seedContactPersons.entries()) {
      const [existing] = await tx
        .select({ id: schema.contactPersons.id })
        .from(schema.contactPersons)
        .where(sql`${schema.contactPersons.name} ->> 'az' = ${person.name.az}`);
      if (existing) continue;
      await tx.insert(schema.contactPersons).values({ ...person, sortOrder });
      contactPersons += 1;
    }

    const pageRows = await tx
      .insert(schema.pages)
      .values({ ...contactPage, status: "published" })
      .onConflictDoNothing()
      .returning({ id: schema.pages.id });

    const [menu] = await tx
      .insert(schema.menus)
      .values({
        key: "main",
        title: { az: "Əsas menyu", ru: "Главное меню", en: "Main menu", de: "Hauptmenü" },
      })
      .onConflictDoNothing()
      .returning({ id: schema.menus.id });
    if (menu) {
      const [page] = await tx
        .select({ id: schema.pages.id })
        .from(schema.pages)
        .where(eq(schema.pages.kind, "contact"));
      await tx.insert(schema.menuItems).values([
        ...mainMenu.map((item, sortOrder) => ({
          menuId: menu.id,
          label: item.label,
          target: "url" as const,
          url: item.url,
          sortOrder,
        })),
        ...(page
          ? [
              {
                menuId: menu.id,
                label: contactPage.title,
                target: "page" as const,
                pageId: page.id,
                sortOrder: mainMenu.length,
              },
            ]
          : []),
      ]);
    }

    return {
      settings: settingsRows.length > 0,
      brands: brandRows.length,
      categories: categoryRows.length,
      contactPersons,
      pages: pageRows.length,
      menus: menu ? 1 : 0,
    };
  });
}

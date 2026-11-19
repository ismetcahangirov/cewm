import "server-only";

import type { Locale } from "./config";
import type az from "./dictionaries/az.json";
import type catalog from "./dictionaries/az/catalog.json";
import type contact from "./dictionaries/az/contact.json";
import type content from "./dictionaries/az/content.json";
import type product from "./dictionaries/az/product.json";
import type seo from "./dictionaries/az/seo.json";

export type Dictionary = typeof az & {
  catalog: typeof catalog;
  product: typeof product;
  content: typeof content;
  contact: typeof contact & typeof az.contact;
  seo: typeof seo;
};

type Loader = () => Promise<{ default: object }>;

const sources: Record<Locale, Loader[]> = {
  az: [
    () => import("./dictionaries/az.json"),
    () => import("./dictionaries/az/catalog.json"),
    () => import("./dictionaries/az/product.json"),
    () => import("./dictionaries/az/content.json"),
    () => import("./dictionaries/az/contact.json"),
    () => import("./dictionaries/az/seo.json"),
  ],
  ru: [
    () => import("./dictionaries/ru.json"),
    () => import("./dictionaries/ru/catalog.json"),
    () => import("./dictionaries/ru/product.json"),
    () => import("./dictionaries/ru/content.json"),
    () => import("./dictionaries/ru/contact.json"),
    () => import("./dictionaries/ru/seo.json"),
  ],
  en: [
    () => import("./dictionaries/en.json"),
    () => import("./dictionaries/en/catalog.json"),
    () => import("./dictionaries/en/product.json"),
    () => import("./dictionaries/en/content.json"),
    () => import("./dictionaries/en/contact.json"),
    () => import("./dictionaries/en/seo.json"),
  ],
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const [base, catalog, product, content, contact, seo] = await Promise.all(
    sources[locale].map((load) => load().then((module) => module.default)),
  );
  const root = base as typeof az;
  return {
    ...root,
    catalog: catalog as Dictionary["catalog"],
    product: product as Dictionary["product"],
    content: content as Dictionary["content"],
    contact: { ...root.contact, ...(contact as Dictionary["contact"]) },
    seo: seo as Dictionary["seo"],
  };
}

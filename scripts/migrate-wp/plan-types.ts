import type { RichTextDoc } from "../../lib/content/rich-text";
import type { Locale } from "../../lib/i18n/config";
import type { SlugMap } from "./slugs";

export type Texts = Record<Locale, string | null>;

export type Docs = Record<Locale, RichTextDoc | null>;

export type EntityType =
  | "product"
  | "category"
  | "page"
  | "brand"
  | "client"
  | "person"
  | "settings"
  | "home"
  | "media"
  | "redirect";

export type FlagKind =
  | "missing-translation"
  | "wrong-language"
  | "mixed-script"
  | "low-resolution"
  | "dead-link"
  | "missing-image"
  | "spec-mismatch"
  | "gallery-mismatch"
  | "benefit-mismatch"
  | "derived"
  | "duplicate-dropped"
  | "corrupted-heading"
  | "placeholder"
  | "cleaned"
  | "not-imported";

export type EntityRef = { type: EntityType; key: string; label: string };

export type Flag = {
  kind: FlagKind;
  entity: EntityRef;
  locale?: Locale;
  field?: string;
  detail: string;
};

export type MediaPlan = {
  sha1: string;
  file: string;
  contentType: string;
  width: number | null;
  height: number | null;
  urls: string[];
  alt: Partial<Record<Locale, string>>;
  altFallback: string | null;
  usedBy: string[];
  lowResolution: boolean;
};

export type SpecRowPlan = {
  label: Texts;
  value: Texts;
  unit: Texts | null;
};

export type ProductImagePlan = { sha1: string };

export type DocumentPlan = {
  url: string;
  downloadUrl: string;
  title: Texts;
};

export type ProductPlan = {
  legacyKey: string;
  group: string;
  categoryKey: string;
  order: number;
  name: Texts;
  slug: SlugMap;
  oldSlug: Texts;
  shortDescription: Docs;
  description: Docs;
  benefits: Texts[];
  specs: SpecRowPlan[];
  images: ProductImagePlan[];
  documents: DocumentPlan[];
  seoTitle: Texts;
  seoDescription: Texts;
  wpIds: Partial<Record<Locale, number>>;
  droppedWpIds: number[];
  featured: boolean;
};

export type CategoryPlan = {
  legacyKey: string;
  key: string;
  order: number;
  name: Texts;
  slug: SlugMap;
  oldSlug: Texts;
  description: Docs;
  imageSha1: string | null;
  seoTitle: Texts;
  seoDescription: Texts;
  seedSlugAz: string | null;
};

export type BrandPlan = {
  legacyKey: string;
  name: string;
  slug: string;
  description: Texts;
  websiteUrl: string | null;
  logoSha1: string | null;
  order: number;
};

export type ClientPlan = { legacyKey: string; name: string; imageSha1: string; order: number };

export type PersonPlan = {
  legacyName: string;
  name: Texts;
  role: Texts;
  phones: string[];
  email: string | null;
  whatsapp: string | null;
  order: number;
};

export type PagePlan = {
  legacyKey: string;
  kind: "contact" | "consultation";
  title: Texts;
  slug: SlugMap;
  content: Docs;
  seoTitle: Texts;
  seoDescription: Texts;
};

export type HomePlan = {
  heroHeadline: Texts;
  heroCtaLabel: Texts;
  heroCtaHref: string;
  titles: { categories: Texts; products: Texts; clients: Texts };
  featuredGroups: string[];
};

export type SettingsPlan = {
  phones: { label: Texts; number: string }[];
  emails: string[];
  address: Texts;
  whatsappNumber: string | null;
  seoTitle: Texts;
  logoLightSha1: string | null;
  faviconSha1: string | null;
};

export type Plan = {
  products: ProductPlan[];
  categories: CategoryPlan[];
  brands: BrandPlan[];
  clients: ClientPlan[];
  persons: PersonPlan[];
  pages: PagePlan[];
  home: HomePlan;
  settings: SettingsPlan;
  media: Map<string, MediaPlan>;
  flags: Flag[];
  notes: string[];
};

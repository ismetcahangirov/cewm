import { localePath, type Locale } from "@/lib/i18n/config";
import { pickLocale } from "@/lib/i18n/localized";
import type { SiteSettings } from "@/lib/public/settings";

export type JsonLd = { "@context"?: string; "@type": string } & Record<string, unknown>;

const defaultName = "Mebline";

function absolute(path: string, siteUrl: string): string {
  return new URL(path, siteUrl).toString();
}

const brandLogo = "/brand/logo.png";

export function organizationJsonLd(
  settings: SiteSettings,
  locale: Locale,
  siteUrl: string,
): JsonLd {
  const name = settings.legalName?.trim() || defaultName;
  const address = settings.address ? pickLocale(settings.address, locale) : null;
  const [mainPhone] = settings.phones;
  const [mainEmail] = settings.emails;

  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${absolute("/", siteUrl)}#organization`,
    name,
    url: absolute(localePath(locale, "/"), siteUrl),
  };
  data.logo = absolute(brandLogo, siteUrl);
  if (mainPhone) data.telephone = mainPhone.number;
  if (mainEmail) data.email = mainEmail;
  if (address) {
    data.address = { "@type": "PostalAddress", streetAddress: address, addressCountry: "AZ" };
  }
  if (settings.socials.length) data.sameAs = settings.socials.map((social) => social.url);
  if (settings.phones.length) {
    data.contactPoint = settings.phones.map((phone) => ({
      "@type": "ContactPoint",
      telephone: phone.number,
      name: pickLocale(phone.label, locale),
      contactType: "customer service",
      areaServed: "AZ",
      availableLanguage: ["az", "ru", "en"],
      ...(mainEmail ? { email: mainEmail } : {}),
    }));
  }
  return data;
}

export function localBusinessJsonLd(
  settings: SiteSettings,
  locale: Locale,
  siteUrl: string,
): JsonLd | null {
  const address = settings.address ? pickLocale(settings.address, locale).trim() : "";
  if (!address) return null;
  const [mainPhone] = settings.phones;
  const [mainEmail] = settings.emails;
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    "@id": `${absolute("/", siteUrl)}#store`,
    name: settings.legalName?.trim() || defaultName,
    url: absolute(localePath(locale, "/"), siteUrl),
    address: { "@type": "PostalAddress", streetAddress: address, addressCountry: "AZ" },
    parentOrganization: { "@id": `${absolute("/", siteUrl)}#organization` },
    areaServed: { "@type": "Country", name: "Azerbaijan" },
  };
  data.image = absolute(brandLogo, siteUrl);
  if (mainPhone) data.telephone = mainPhone.number;
  if (mainEmail) data.email = mainEmail;
  if (settings.mapUrl) data.hasMap = settings.mapUrl;
  if (settings.socials.length) data.sameAs = settings.socials.map((social) => social.url);
  return data;
}

export function businessJsonLd(settings: SiteSettings, locale: Locale, siteUrl: string): JsonLd[] {
  const store = localBusinessJsonLd(settings, locale, siteUrl);
  return [organizationJsonLd(settings, locale, siteUrl), ...(store ? [store] : [])];
}

export function websiteJsonLd(settings: SiteSettings, locale: Locale, siteUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absolute("/", siteUrl)}#website`,
    name: settings.legalName?.trim() || defaultName,
    url: absolute(localePath(locale, "/"), siteUrl),
    inLanguage: locale,
    publisher: { "@id": `${absolute("/", siteUrl)}#organization` },
  };
}

export type BreadcrumbItem = { label: string; href?: string | null };

export function breadcrumbJsonLd(items: BreadcrumbItem[], siteUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: absolute(item.href, siteUrl) } : {}),
    })),
  };
}

export function absoluteUrl(path: string, siteUrl: string): string {
  return absolute(path, siteUrl);
}

export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function collectionPageJsonLd(input: {
  name: string;
  description?: string | null;
  url: string;
  locale: Locale;
  siteUrl?: string;
  items?: { name: string; url: string }[];
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.siteUrl ? absolute(input.url, input.siteUrl) : input.url,
    inLanguage: input.locale,
    ...(input.items?.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: input.items.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              url: input.siteUrl ? absolute(item.url, input.siteUrl) : item.url,
            })),
          },
        }
      : {}),
  };
}

export function aboutPageJsonLd(input: {
  name: string;
  description?: string | null;
  url: string;
  locale: Locale;
  siteUrl: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: absolute(input.url, input.siteUrl),
    inLanguage: input.locale,
    about: { "@id": `${absolute("/", input.siteUrl)}#organization` },
  };
}

export function blogPostingJsonLd(input: {
  headline: string;
  description?: string | null;
  url: string;
  image?: string | null;
  datePublished: string;
  locale: Locale;
  siteUrl: string;
  publisherName: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.headline,
    ...(input.description ? { description: input.description } : {}),
    mainEntityOfPage: absolute(input.url, input.siteUrl),
    ...(input.image ? { image: absolute(input.image, input.siteUrl) } : {}),
    datePublished: input.datePublished,
    dateModified: input.datePublished,
    inLanguage: input.locale,
    author: { "@type": "Organization", name: input.publisherName },
    publisher: { "@id": `${absolute("/", input.siteUrl)}#organization` },
  };
}

const jobEmploymentTypes = {
  "full-time": "FULL_TIME",
  "part-time": "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
} as const;

export function jobPostingJsonLd(input: {
  title: string;
  description: string;
  url: string;
  datePosted: string;
  validThrough: string | null;
  employmentType: keyof typeof jobEmploymentTypes;
  location: string | null;
  locale: Locale;
  siteUrl: string;
  organizationName: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: input.title,
    description: input.description,
    url: absolute(input.url, input.siteUrl),
    datePosted: input.datePosted,
    ...(input.validThrough ? { validThrough: `${input.validThrough}T23:59:59+04:00` } : {}),
    employmentType: jobEmploymentTypes[input.employmentType],
    inLanguage: input.locale,
    hiringOrganization: {
      "@type": "Organization",
      "@id": `${absolute("/", input.siteUrl)}#organization`,
      name: input.organizationName,
      sameAs: absolute("/", input.siteUrl),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: input.location ?? "Baku",
        addressCountry: "AZ",
      },
    },
  };
}

export type ProductJsonLdInput = {
  name: string;
  url: string;
  images: string[];
  description: string | null;
  category: string | null;
  sku: string | null;
};

export function productJsonLd(input: ProductJsonLdInput, siteUrl: string): JsonLd {
  const url = absolute(input.url, siteUrl);
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: input.name,
    url,
    brand: { "@type": "Brand", name: defaultName },
    manufacturer: {
      "@type": "Organization",
      "@id": `${absolute("/", siteUrl)}#organization`,
      name: defaultName,
    },
  };
  if (input.images.length) data.image = input.images.map((src) => absolute(src, siteUrl));
  if (input.description) data.description = input.description;
  if (input.category) data.category = input.category;
  if (input.sku) data.sku = input.sku;
  return data;
}

export type ProjectJsonLdInput = {
  name: string;
  url: string;
  locale: Locale;
  images: string[];
  description: string | null;
  client: string | null;
};

export function projectJsonLd(input: ProjectJsonLdInput, siteUrl: string): JsonLd {
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: input.name,
    url: absolute(input.url, siteUrl),
    inLanguage: input.locale,
    creator: { "@id": `${absolute("/", siteUrl)}#organization`, name: defaultName },
  };
  if (input.images.length) data.image = input.images.map((src) => absolute(src, siteUrl));
  if (input.description) data.description = input.description;
  if (input.client) data.sourceOrganization = { "@type": "Organization", name: input.client };
  return data;
}

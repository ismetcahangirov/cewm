export type JsonLdNode = Record<string, unknown>;

function isAbsoluteUrl(value: unknown): boolean {
  return typeof value === "string" && /^https?:\/\/\S+$/.test(value);
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

export function nodeTypes(node: JsonLdNode): string[] {
  return asList(node["@type"]).filter((type): type is string => typeof type === "string");
}

export function flattenJsonLd(data: unknown): JsonLdNode[] {
  if (Array.isArray(data)) return data.flatMap(flattenJsonLd);
  if (!data || typeof data !== "object") return [];
  const node = data as JsonLdNode;
  return node["@graph"] ? flattenJsonLd(node["@graph"]) : [node];
}

export function validateJsonLdNode(node: JsonLdNode): string[] {
  const problems: string[] = [];
  const types = nodeTypes(node);
  const label = types.join("+") || "node";
  const need = (key: string) => {
    const value = node[key];
    if (value === undefined || value === null || value === "")
      problems.push(`${label} lacks ${key}`);
  };
  const urlProblem = (key: string) => {
    for (const value of asList(node[key])) {
      const url = typeof value === "object" && value ? (value as JsonLdNode).url : value;
      if (!isAbsoluteUrl(url)) problems.push(`${label} ${key} is not an absolute URL`);
    }
  };

  if (!types.length) problems.push("node has no @type");
  if (node["@context"] !== undefined && node["@context"] !== "https://schema.org") {
    problems.push(`${label} has an unexpected @context`);
  }

  if (types.includes("Organization") || types.includes("LocalBusiness")) {
    need("name");
    need("url");
    urlProblem("url");
    for (const link of asList(node.sameAs)) {
      if (!isAbsoluteUrl(link)) problems.push(`${label} sameAs has a bad URL`);
    }
    if (types.includes("LocalBusiness")) {
      const address = node.address as JsonLdNode | undefined;
      if (!address) problems.push(`${label} lacks address`);
      else {
        if (address["@type"] !== "PostalAddress")
          problems.push(`${label} address is not PostalAddress`);
        if (!address.streetAddress) problems.push(`${label} address lacks streetAddress`);
        if (!address.addressCountry) problems.push(`${label} address lacks addressCountry`);
      }
    }
  }

  if (types.includes("WebSite")) {
    need("name");
    need("url");
  }

  if (types.includes("Product")) {
    need("name");
    need("image");
    if ("offers" in node) problems.push("Product has offers although no price is published");
    if ("aggregateRating" in node || "review" in node)
      problems.push("Product has a rating or review");
    for (const image of asList(node.image)) {
      if (!isAbsoluteUrl(image)) problems.push("Product image is not an absolute URL");
    }
    for (const property of asList(node.additionalProperty) as JsonLdNode[]) {
      if (property["@type"] !== "PropertyValue" || !property.name || !property.value) {
        problems.push("Product additionalProperty is not a complete PropertyValue");
      }
    }
    if (node.brand && (node.brand as JsonLdNode).name === undefined)
      problems.push("Product brand lacks name");
  }

  if (types.includes("BreadcrumbList")) {
    const items = asList(node.itemListElement) as JsonLdNode[];
    if (!items.length) problems.push("BreadcrumbList is empty");
    items.forEach((item, index) => {
      if (item.position !== index + 1) problems.push("BreadcrumbList positions are not 1..n");
      if (!item.name) problems.push("BreadcrumbList item lacks name");
      if (index < items.length - 1 && !isAbsoluteUrl(item.item)) {
        problems.push("BreadcrumbList item lacks an absolute item URL");
      }
    });
  }

  if (types.includes("BlogPosting") || types.includes("Article")) {
    for (const key of [
      "headline",
      "image",
      "datePublished",
      "dateModified",
      "author",
      "publisher",
    ]) {
      need(key);
    }
    for (const key of ["datePublished", "dateModified"]) {
      if (node[key] && Number.isNaN(Date.parse(String(node[key]))))
        problems.push(`${label} ${key} is not a date`);
    }
  }

  if (
    types.includes("CollectionPage") ||
    types.includes("AboutPage") ||
    types.includes("ContactPage")
  ) {
    need("name");
    need("url");
    urlProblem("url");
    const list = node.mainEntity as JsonLdNode | undefined;
    if (list && nodeTypes(list).includes("ItemList")) {
      asList(list.itemListElement).forEach((item, index) => {
        const entry = item as JsonLdNode;
        if (entry.position !== index + 1) problems.push("ItemList positions are not 1..n");
        if (!isAbsoluteUrl(entry.url)) problems.push("ItemList item lacks an absolute url");
      });
    }
  }

  if (types.includes("FAQPage")) {
    const questions = asList(node.mainEntity) as JsonLdNode[];
    if (!questions.length) problems.push("FAQPage has no questions");
    for (const question of questions) {
      if (!question.name || !(question.acceptedAnswer as JsonLdNode | undefined)?.text) {
        problems.push("FAQPage question lacks name or answer text");
      }
    }
  }

  return problems;
}

export function validateJsonLd(data: unknown): string[] {
  return flattenJsonLd(data).flatMap(validateJsonLdNode);
}

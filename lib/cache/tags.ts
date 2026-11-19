export const publicTags = {
  catalog: "catalog",
  content: "content",
  menus: "menus",
  settings: "settings",
} as const;

export type PublicTag = (typeof publicTags)[keyof typeof publicTags];

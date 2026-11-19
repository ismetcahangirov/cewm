export const routes = {
  home: () => "/",
  catalogue: () => "/mehsullar",
  categories: () => "/kateqoriyalar",
  category: (slug: string) => `/mehsullar/${slug}`,
  product: (slug: string) => `/mehsul/${slug}`,
  blog: () => "/bloq",
  post: (slug: string) => `/bloq/${slug}`,
  page: (slug: string) => `/${slug}`,
  media: (key: string) => `/media/${key}`,
};

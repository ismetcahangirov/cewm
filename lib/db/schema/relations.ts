import { relations } from "drizzle-orm";

import {
  categories,
  productCategories,
  productImages,
  productRelations,
  products,
} from "./catalog";
import { logos, pages, posts, projectImages, projects } from "./content";
import { media } from "./media";
import { menuItems, menus } from "./navigation";
import { quoteRequestProducts, quoteRequests } from "./quotes";

export const mediaRelations = relations(media, ({ one }) => ({
  original: one(media, { fields: [media.originalId], references: [media.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, { relationName: "category_parent" }),
  image: one(media, { fields: [categories.imageId], references: [media.id] }),
  products: many(productCategories),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  categories: many(productCategories),
  images: many(productImages),
  related: many(productRelations, { relationName: "product_related_from" }),
  model: one(media, { fields: [products.modelId], references: [media.id] }),
  modelPoster: one(media, { fields: [products.modelPosterId], references: [media.id] }),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
  media: one(media, { fields: [productImages.mediaId], references: [media.id] }),
}));

export const productRelationsRelations = relations(productRelations, ({ one }) => ({
  product: one(products, {
    fields: [productRelations.productId],
    references: [products.id],
    relationName: "product_related_from",
  }),
  related: one(products, { fields: [productRelations.relatedId], references: [products.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  cover: one(media, { fields: [projects.coverId], references: [media.id] }),
  images: many(projectImages),
}));

export const projectImagesRelations = relations(projectImages, ({ one }) => ({
  project: one(projects, { fields: [projectImages.projectId], references: [projects.id] }),
  media: one(media, { fields: [projectImages.mediaId], references: [media.id] }),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  cover: one(media, { fields: [pages.coverId], references: [media.id] }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  cover: one(media, { fields: [posts.coverId], references: [media.id] }),
}));

export const logosRelations = relations(logos, ({ one }) => ({
  image: one(media, { fields: [logos.imageId], references: [media.id] }),
}));

export const menusRelations = relations(menus, ({ many }) => ({
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  menu: one(menus, { fields: [menuItems.menuId], references: [menus.id] }),
  parent: one(menuItems, {
    fields: [menuItems.parentId],
    references: [menuItems.id],
    relationName: "menu_item_parent",
  }),
  children: many(menuItems, { relationName: "menu_item_parent" }),
  category: one(categories, { fields: [menuItems.categoryId], references: [categories.id] }),
  page: one(pages, { fields: [menuItems.pageId], references: [pages.id] }),
  project: one(projects, { fields: [menuItems.projectId], references: [projects.id] }),
}));

export const quoteRequestsRelations = relations(quoteRequests, ({ many }) => ({
  products: many(quoteRequestProducts),
}));

export const quoteRequestProductsRelations = relations(quoteRequestProducts, ({ one }) => ({
  quoteRequest: one(quoteRequests, {
    fields: [quoteRequestProducts.quoteRequestId],
    references: [quoteRequests.id],
  }),
  product: one(products, { fields: [quoteRequestProducts.productId], references: [products.id] }),
}));

import { relations } from "drizzle-orm";

import {
  brands,
  categories,
  productCategories,
  productDocuments,
  productImages,
  productRelations,
  products,
} from "./catalog";
import { consultationRequestProducts, consultationRequests } from "./consultations";
import { clientLogos, contactPersons, heroFilms, pages, posts } from "./content";
import { media } from "./media";
import { menuItems, menus } from "./navigation";

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

export const brandsRelations = relations(brands, ({ one, many }) => ({
  logo: one(media, { fields: [brands.logoId], references: [media.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  categories: many(productCategories),
  images: many(productImages),
  documents: many(productDocuments),
  related: many(productRelations, { relationName: "product_related_from" }),
  video: one(media, {
    fields: [products.videoId],
    references: [media.id],
    relationName: "product_video",
  }),
  videoPoster: one(media, {
    fields: [products.videoPosterId],
    references: [media.id],
    relationName: "product_video_poster",
  }),
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

export const productDocumentsRelations = relations(productDocuments, ({ one }) => ({
  product: one(products, { fields: [productDocuments.productId], references: [products.id] }),
  media: one(media, { fields: [productDocuments.mediaId], references: [media.id] }),
}));

export const productRelationsRelations = relations(productRelations, ({ one }) => ({
  product: one(products, {
    fields: [productRelations.productId],
    references: [products.id],
    relationName: "product_related_from",
  }),
  related: one(products, { fields: [productRelations.relatedId], references: [products.id] }),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  cover: one(media, { fields: [pages.coverId], references: [media.id] }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  cover: one(media, { fields: [posts.coverId], references: [media.id] }),
}));

export const clientLogosRelations = relations(clientLogos, ({ one }) => ({
  image: one(media, { fields: [clientLogos.imageId], references: [media.id] }),
}));

export const contactPersonsRelations = relations(contactPersons, ({ one }) => ({
  photo: one(media, { fields: [contactPersons.photoId], references: [media.id] }),
}));

export const heroFilmsRelations = relations(heroFilms, ({ one }) => ({
  poster: one(media, { fields: [heroFilms.posterId], references: [media.id] }),
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
}));

export const consultationRequestsRelations = relations(consultationRequests, ({ many }) => ({
  products: many(consultationRequestProducts),
}));

export const consultationRequestProductsRelations = relations(
  consultationRequestProducts,
  ({ one }) => ({
    consultationRequest: one(consultationRequests, {
      fields: [consultationRequestProducts.consultationRequestId],
      references: [consultationRequests.id],
    }),
    product: one(products, {
      fields: [consultationRequestProducts.productId],
      references: [products.id],
    }),
  }),
);

import { createTranslator } from "./translate";
import * as common from "./messages/common";
import * as validation from "./messages/validation";
import * as dashboard from "./messages/dashboard";
import * as products from "./messages/products";
import * as categories from "./messages/categories";
import * as brands from "./messages/brands";
import * as media from "./messages/media";
import * as pages from "./messages/pages";
import * as blog from "./messages/blog";
import * as clients from "./messages/clients";
import * as contacts from "./messages/contacts";
import * as menus from "./messages/menus";
import * as homeSections from "./messages/home-sections";
import * as heroFilms from "./messages/hero-films";
import * as settings from "./messages/settings";
import * as redirects from "./messages/redirects";
import * as requests from "./messages/requests";
import * as users from "./messages/users";
import * as auth from "./messages/auth";
import * as localization from "./messages/localization";
import * as seo from "./messages/seo";

export const ru = {
  ...common.ru,
  ...validation.ru,
  ...dashboard.ru,
  ...products.ru,
  ...categories.ru,
  ...brands.ru,
  ...media.ru,
  ...pages.ru,
  ...blog.ru,
  ...clients.ru,
  ...contacts.ru,
  ...menus.ru,
  ...homeSections.ru,
  ...heroFilms.ru,
  ...settings.ru,
  ...redirects.ru,
  ...requests.ru,
  ...users.ru,
  ...auth.ru,
  ...localization.ru,
  ...seo.ru,
};

export type MessageKey = keyof typeof ru;

export const en: Record<MessageKey, string> = {
  ...common.en,
  ...validation.en,
  ...dashboard.en,
  ...products.en,
  ...categories.en,
  ...brands.en,
  ...media.en,
  ...pages.en,
  ...blog.en,
  ...clients.en,
  ...contacts.en,
  ...menus.en,
  ...homeSections.en,
  ...heroFilms.en,
  ...settings.en,
  ...redirects.en,
  ...requests.en,
  ...users.en,
  ...auth.en,
  ...localization.en,
  ...seo.en,
};

export const de: Record<MessageKey, string> = {
  ...common.de,
  ...validation.de,
  ...dashboard.de,
  ...products.de,
  ...categories.de,
  ...brands.de,
  ...media.de,
  ...pages.de,
  ...blog.de,
  ...clients.de,
  ...contacts.de,
  ...menus.de,
  ...homeSections.de,
  ...heroFilms.de,
  ...settings.de,
  ...redirects.de,
  ...requests.de,
  ...users.de,
  ...auth.de,
  ...localization.de,
  ...seo.de,
};

export const { translate, translateMessage } = createTranslator({ ru, en, de });

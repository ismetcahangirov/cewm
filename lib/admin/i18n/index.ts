import { createTranslator } from "./translate";
import * as common from "./messages/common";
import * as validation from "./messages/validation";
import * as dashboard from "./messages/dashboard";
import * as products from "./messages/products";
import * as categories from "./messages/categories";
import * as media from "./messages/media";
import * as projects from "./messages/projects";
import * as pages from "./messages/pages";
import * as blog from "./messages/blog";
import * as vacancies from "./messages/vacancies";
import * as logos from "./messages/logos";
import * as team from "./messages/team";
import * as menus from "./messages/menus";
import * as homeSections from "./messages/home-sections";
import * as settings from "./messages/settings";
import * as redirects from "./messages/redirects";
import * as requests from "./messages/requests";
import * as users from "./messages/users";
import * as auth from "./messages/auth";

export const ru = {
  ...common.ru,
  ...validation.ru,
  ...dashboard.ru,
  ...products.ru,
  ...categories.ru,
  ...media.ru,
  ...projects.ru,
  ...pages.ru,
  ...blog.ru,
  ...vacancies.ru,
  ...logos.ru,
  ...team.ru,
  ...menus.ru,
  ...homeSections.ru,
  ...settings.ru,
  ...redirects.ru,
  ...requests.ru,
  ...users.ru,
  ...auth.ru,
};

export type MessageKey = keyof typeof ru;

export const en: Record<MessageKey, string> = {
  ...common.en,
  ...validation.en,
  ...dashboard.en,
  ...products.en,
  ...categories.en,
  ...media.en,
  ...projects.en,
  ...pages.en,
  ...blog.en,
  ...vacancies.en,
  ...logos.en,
  ...team.en,
  ...menus.en,
  ...homeSections.en,
  ...settings.en,
  ...redirects.en,
  ...requests.en,
  ...users.en,
  ...auth.en,
};

export const { translate, translateMessage } = createTranslator({ ru, en });

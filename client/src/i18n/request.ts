import {getRequestConfig} from "next-intl/server";
import {defaultLocale, locales} from "./config";
import type {Locale} from "./config";

export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  const matchedLocale = locales.find((candidate) => candidate === locale);
  const resolvedLocale: Locale = matchedLocale ?? defaultLocale;

  const messages = (await import(`../locales/${resolvedLocale}/common.json`)).default;

  return {
    locale: resolvedLocale,
    messages,
  };
});

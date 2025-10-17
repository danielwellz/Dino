export const locales = ["en", "fa"] as const;

export const defaultLocale = "en";

export const localePrefix = "never";

export type Locale = (typeof locales)[number];

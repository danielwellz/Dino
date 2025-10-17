import createIntlMiddleware from "next-intl/middleware";
import { defaultLocale, locales, localePrefix } from "./src/i18n/config";

export default createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix,
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

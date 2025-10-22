import type { Metadata } from "next";
import "./globals.css";
import DashboardWrapper from "./DashboardWrapper";
import { Analytics } from "@vercel/analytics/react";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { defaultLocale, locales } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

async function getMessages(locale: Locale) {
  try {
    const messages = (await import(`@/locales/${locale}/common.json`)).default;
    return messages;
  } catch {
    const fallback = (await import(`@/locales/${defaultLocale}/common.json`)).default;
    return fallback;
  }
}

export const metadata: Metadata = {
  title: "پلتفرم مدیریت پروژه‌های چندرسانه‌ای داینو | Dyno Multimedia Project Management Platform",
  description: "Bilingual multimedia project management experience for creative and production teams.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const matchedLocale = locales.find((candidate) => candidate === cookieLocale);
  const locale: Locale = matchedLocale ?? defaultLocale;
  const messages = await getMessages(locale);

  const showAnalytics =
    process.env.NODE_ENV === "production" && Boolean(process.env.VERCEL_ANALYTICS_ID);

  return (
    <html lang={locale} dir={locale === "fa" ? "rtl" : "ltr"}>
      <head />
      <body className="antialiased" suppressHydrationWarning>
        {showAnalytics ? <Analytics /> : null}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <DashboardWrapper>{children}</DashboardWrapper>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

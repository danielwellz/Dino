import { defaultLocale } from "@/i18n/config";

const PLACEHOLDER_MAP: Record<string, string> = {
  en: "/user1.png",
  fa: "/user2.png",
};

export const getLocalizedAvatarPlaceholder = (locale?: string | null) => {
  const normalized = (locale ?? defaultLocale).toLowerCase();
  return PLACEHOLDER_MAP[normalized] ?? PLACEHOLDER_MAP[defaultLocale];
};


"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo, useState, useTransition } from "react";

type LanguageSwitcherProps = {
  variant?: "inline" | "compact";
  className?: string;
};

export default function LanguageSwitcher({
  variant = "inline",
  className,
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const t = useTranslations("language");
  const languages = useMemo(
    () => [
      { code: "en", label: t("english") },
      { code: "fa", label: t("farsi") },
    ],
    [t]
  );
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const options = useMemo(() => languages, []);

  const handleSelect = (nextLocale: string) => {
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
    setOpen(false);
    startTransition(() => {
      router.replace(pathname);
      router.refresh();
    });
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() =>
          handleSelect(locale === "fa" ? "en" : "fa")
        }
        className={`text-sm font-medium px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-100 transition ${className ?? ""}`}
        aria-label="Change language"
      >
        {locale === "fa" ? "EN" : "فا"}
      </button>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 text-sm hover:bg-gray-100 transition"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
      >
        <span>{options.find((option) => option.code === locale)?.label ?? "English"}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul
          className="absolute right-0 mt-2 w-32 rounded-md border border-gray-200 bg-white shadow-lg z-50"
          role="listbox"
        >
          {options.map((option) => (
            <li
              key={option.code}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                option.code === locale ? "text-primary-600 font-semibold" : "text-gray-700"
              }`}
              onClick={() => handleSelect(option.code)}
              role="option"
              aria-selected={option.code === locale}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

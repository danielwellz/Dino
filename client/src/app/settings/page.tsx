"use client";

import React from "react";
import { useTranslations } from "next-intl";

const SettingsPage = () => {
  const t = useTranslations("settingsPage");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-10 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-secondary-950">{t("title")}</h1>
          <p className="mt-2 text-gray-600">{t("subtitle")}</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10 space-y-10">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-secondary-950">{t("profile.heading")}</h2>
          <p className="mt-2 text-sm text-gray-600">{t("profile.description")}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700">{t("profile.email")}</span>
              <input
                type="email"
                disabled
                className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600 shadow-sm"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700">{t("profile.language")}</span>
              <input
                type="text"
                disabled
                className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600 shadow-sm"
                value={t("profile.languageValue")}
              />
            </label>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-secondary-950">{t("notifications.heading")}</h2>
          <p className="mt-2 text-sm text-gray-600">{t("notifications.description")}</p>
          <div className="mt-6 space-y-4">
            <ToggleRow
              label={t("notifications.email")}
              description={t("notifications.emailDescription")}
            />
            <ToggleRow
              label={t("notifications.desktop")}
              description={t("notifications.desktopDescription")}
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-secondary-950">{t("security.heading")}</h2>
          <p className="mt-2 text-sm text-gray-600">{t("security.description")}</p>
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">{t("security.password")}</p>
              <p className="text-xs text-gray-500">{t("security.passwordHint")}</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-primary-500 px-4 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50"
            >
              {t("actions.changePassword")}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

type ToggleRowProps = {
  label: string;
  description: string;
};

const ToggleRow = ({ label, description }: ToggleRowProps) => (
  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
    <div>
      <p className="text-sm font-medium text-secondary-950">{label}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" className="peer sr-only" defaultChecked />
      <div className="peer h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-primary-500 peer-focus:outline-none" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
    </label>
  </div>
);

export default SettingsPage;

"use client";

import React from "react";
import { useTranslations } from "next-intl";

const featureConfig = [
  {
    key: "graph",
    color: "bg-primary-100 text-primary-600",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    key: "messaging",
    color: "bg-green-100 text-green-600",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: "sequencing",
    color: "bg-secondary-100 text-secondary-600",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 8l4 4-4 4M7 16l-4-4 4-4M13 6l-2 12" />
      </svg>
    ),
  },
  {
    key: "gantt",
    color: "bg-yellow-100 text-yellow-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M3 12h12M3 18h6" />
      </svg>
    ),
  },
  {
    key: "security",
    color: "bg-gray-100 text-gray-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="7" r="4" />
        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      </svg>
    ),
  },
];

const FeaturesSection = () => {
  const t = useTranslations("landing.features");

  return (
    <section id="features" className="py-8 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="font-bold text-[2.5rem] md:text-4xl mb-4">{t("title")}</h2>
          <p className="font-light text-xl md:text-xl text-gray-600 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {featureConfig.map(({ key, color, icon }) => (
            <div
              key={key}
              className="p-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:translate-y-[-4px] border border-gray-200 bg-white"
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${color}`}>
                {icon}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-secondary-600">
                {t(`items.${key}.title`)}
              </h3>
              <p className="text-gray-600 leading-relaxed">{t(`items.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

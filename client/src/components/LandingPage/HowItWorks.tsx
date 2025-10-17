"use client";

import React from "react";
import { useTranslations } from "next-intl";

const stepColors = ["bg-primary-400", "bg-secondary-400", "bg-primary-400", "bg-secondary-400"];

const HowItWorksSection = () => {
  const t = useTranslations("landing.howItWorks");
  const steps = ["1", "2", "3", "4"];

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">{t("title")}</h2>
          <p className="text-xl font-medium text-gray-700 mb-12 max-w-3xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={step}
              className="relative pb-12 last:pb-0"
              style={{ paddingInlineStart: "2.5rem" }}
            >
              {index < steps.length - 1 && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-gray-200"
                  style={{ insetInlineStart: "1rem" }}
                />
              )}
              <div
                className={`absolute top-0 w-8 h-8 rounded-full ${stepColors[index]} flex items-center justify-center text-white font-medium`}
                style={{ insetInlineStart: "0" }}
              >
                {step}
              </div>
              <div style={{ marginInlineStart: "1.5rem" }}>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">{t(`steps.${step}.title`)}</h3>
                <p className="text-gray-600">{t(`steps.${step}.description`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

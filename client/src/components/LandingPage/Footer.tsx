"use client";

import React from "react";
import Logo from "@/components/Logo";
import { useTranslations } from "next-intl";

const socialLinks = [
  {
    href: "https://github.com/AhmedTrb/Project-Management-web-app",
    label: "GitHub",
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.068-.608.068-.608 1.003.07 1.532 1.03 1.532 1.03.891 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.839a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.376.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.934.359.31.678.92.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.16 22 16.416 22 12c0-5.523-4.477-10-10-10z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    href: "https://www.linkedin.com/in/ahmed-trabelsi-tn/",
    label: "LinkedIn",
    icon: (
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    ),
  },
];

const Footer = () => {
  const t = useTranslations("landing.footer");

  return (
    <footer className="bg-primary-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-4">
              <Logo size="md" />
            </div>
            <p className="mt-4 text-gray-600 max-w-md leading-relaxed">{t("description")}</p>
            <div className="mt-4 flex gap-4" dir="ltr">
              {socialLinks.map(({ href, label, icon }) => (
                <a key={label} href={href} className="text-gray-600 hover:text-primary-600" aria-label={label} target="_blank" rel="noopener noreferrer">
                  {icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 tracking-wider uppercase">{t("linksTitle")}</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="https://github.com/AhmedTrb/Project-Management-web-app" className="text-gray-600 hover:text-primary-600" target="_blank" rel="noopener noreferrer">
                  {t("repository")}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-primary-600">
                  {t("liveDemo")}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-primary-600">
                  {t("roadmap")}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-primary-600">
                  {t("support")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-4 flex flex-col md:flex-row justify-between gap-4">
          <p className="text-gray-600 text-sm">{t("copyright")}</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <a href="#" className="hover:text-primary-600">
              {t("legal.privacy")}
            </a>
            <a href="#" className="hover:text-primary-600">
              {t("legal.terms")}
            </a>
            <a href="#" className="hover:text-primary-600">
              {t("legal.contact")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

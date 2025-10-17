"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import StaticGraphExample from "./StaticGraphExample";
import { useTranslations } from "next-intl";

const HeroSection = () => {
  const t = useTranslations("landing.hero");
  return (
    <section className="hero-gradient pt-28 pb-16 md:pt-32 md:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-600 mb-6 animate-fade-in">
            {t("title")}
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 md:mb-12 animate-fade-in">
            {t("subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-6 text-lg">
              {t("ctaDemo")}
            </Button>
            <Button variant="outline" className="border-secondary-600 text-secondary-600 hover:bg-secondary-50 px-8 py-6 text-lg">
              <a href="https://github.com/AhmedTrb/Project-Management-web-app" target="_blank" rel="noopener noreferrer">
                {t("ctaGithub")}
              </a>
            </Button>
          </div>
        </div>
        <div className="mt-16 max-w-5xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white z-10 h-16 bottom-0 left-1 right-1"></div>
          <div className="relative rounded-xl shadow-xl overflow-hidden border border-gray-200">
            <div className="absolute top-0 left-0 right-0 h-10 flex items-center px-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>
            <div className="pt-10 w-full h-[500px] py-4">
              
                <StaticGraphExample />
              
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

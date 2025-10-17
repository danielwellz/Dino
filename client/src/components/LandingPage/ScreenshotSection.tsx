"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

const mediaItems = [
  {
    key: "graph",
    media: "/graphView.png",
  },
  {
    key: "kanban",
    media: "/board.png",
  },
  {
    key: "task",
    media: "/taskDetail.png",
  },
  {
    key: "messaging",
    media: "/videos/real-time-messaging.mp4",
  },
  {
    key: "reschedule",
    media: "/videos/rescheduling-feature.mp4",
  },
];

const isVideo = (url: string) => /\.(mp4|webm|ogg)$/i.test(url);

const ScreenshotSection: React.FC = () => {
  const t = useTranslations("landing.screenshots");

  return (
    <section id="screenshots" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">{t("title")}</h2>
          <p className="text-xl font-medium text-gray-700 mb-12 max-w-3xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {mediaItems.map(({ key, media }) => (
            <div
              key={key}
              className="flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition-shadow duration-300"
            >
              <div className="relative h-48 sm:h-64 bg-gray-100">
                {isVideo(media) ? (
                  <video
                    src={media}
                    preload="none"
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  <Image
                    src={media}
                    alt={t(`items.${key}.title`)}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 45vw, 100vw"
                    className="object-cover transition-transform duration-500 hover:scale-105"
                  />
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2 text-gray-800">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="text-gray-600">{t(`items.${key}.description`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ScreenshotSection;

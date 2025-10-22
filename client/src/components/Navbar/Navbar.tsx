"use client";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { Bell, CalendarDays, ChevronDown, Search } from "lucide-react";
import React, { useState } from "react";
import { logOut } from "@/state/authSlice";
import { useRouter } from "next/navigation";
import { useLogoutMutation } from "@/state/api";
import Image from "next/image";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocale, useTranslations } from "next-intl";
import { getLocalizedAvatarPlaceholder } from "@/lib/avatar";



function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [logout] = useLogoutMutation();
  const [dropDownIsOpen, setDropDownIsOpen] = useState(false);
  const tGeneral = useTranslations("general");
  const locale = useLocale();
  const placeholderAvatar = getLocalizedAvatarPlaceholder(locale);
  const isRTL = locale === "fa";

  const handleLogout = () => {
    dispatch(logOut());
    logout();
    router.push("/");
  };
  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`flex items-center justify-between h-16 py-5 px-10 md:px-8 w-full border-b border-[#d5d5d5] ${isRTL ? "flex-row-reverse" : ""}`}
    >
      {/* SEARCH BAR */}
      <div
        className={`bg-gray-100 rounded-md px-2 py-1 flex items-center gap-2 w-full md:w-1/3 ${isRTL ? "flex-row-reverse text-right" : ""}`}
      >
        <Search size={20} className="text-gray-500" />
        <input
          type="text"
          placeholder={tGeneral("search")}
          className={`bg-transparent outline-none border-none w-full ${isRTL ? "text-right" : ""}`}
        />
      </div>

      {/* USER PROFILE */}
      <div className={`flex items-center gap-8 ${isRTL ? "flex-row-reverse" : ""}`}>
        {/* Icons */}
        <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
          <CalendarDays size={25} className="text-gray-500 cursor-pointer" />
          <div>
            <div className="relative cursor-pointer">
              <div
                className={`absolute top-0 ${isRTL ? "left-0" : "right-0"} w-2 h-2 bg-red-500 rounded-full`}
              ></div>
              <Bell size={25} className="text-gray-500" />
            </div>
          </div>
        </div>
        <LanguageSwitcher variant="compact" />
        {/* Profile */}
        <div className={`flex items-center ${isRTL ? "flex-row-reverse gap-6" : "gap-10"}`}>
          <div className={`flex flex-col gap-1 ${isRTL ? "text-right" : "text-left"}`}>
            <p className="text-sm font-medium truncate max-w-[160px]">{user?.username}</p>
            <p className="text-xs text-gray-500">{tGeneral("location")}</p>
          </div>
          <div className={`flex items-center ${isRTL ? "flex-row-reverse gap-2" : "gap-3"}`}>
            {user?.profilePictureUrl ? (
              <Image
                src={user.profilePictureUrl}
                width={40}
                height={40}
                alt={tGeneral("profile")}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <Image
                src={placeholderAvatar}
                width={40}
                height={40}
                alt={tGeneral("profile")}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div
              className="relative"
              onClick={() => setDropDownIsOpen(!dropDownIsOpen)}
              
            >
              <ChevronDown
                size={25}
                className="text-gray-500 cursor-pointer hover:transform-rotate-180 hover:text-black duration-300"
              />
              {dropDownIsOpen && (
                <div
                  className={`absolute top-5 ${isRTL ? "left-0" : "right-0"} w-40 bg-white shadow rounded-md p-2 border border-gray-200 flex flex-col gap-y-2 z-50`}
                >
                  <div className="cursor-pointer border-b border-red-600 w-full">
                    <p
                      className="text-sm  text-red-500  mb-1 hover:text-red-600 hover:bg-red-300 hover:bg-opacity-40 rounded-md px-2 py-1 w-full"
                      onClick={handleLogout}
                    >
                      {tGeneral("logout")}
                    </p>
                  </div>
                  <div className="cursor-pointer border-b border-gray-200 w-full">
                    <a
                      href="/settings"
                      onClick={() => setDropDownIsOpen(false)}
                    >
                      <p className="text-sm text-gray-500 mb-1 hover:text-gray-950 hover:bg-gray-100 rounded-md px-2 py-1">
                        {tGeneral("settings")}
                      </p>
                    </a>
                  </div>
                  <div className="cursor-pointer border-b border-gray-500 w-full">
                    <a href="/profile">
                      <p className="text-sm  text-gray-500  mb-1 hover:text-gray-950 hover:bg-gray-100 rounded-md px-2 py-1">
                        {tGeneral("profile")}
                      </p>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Navbar;

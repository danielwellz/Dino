"use client";
import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";

const NavBar = () => {
  const tNav = useTranslations("landing.nav");
  const tAuth = useTranslations("auth");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  return (
    <header className="fixed w-full bg-white/90 backdrop-blur-sm z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:space-x-10">
          <div className="flex justify-start lg:w-0 lg:flex-1">
            <span className="cursor-pointer flex items-center ">
              <Logo size="sm" priority />
            </span>
          </div>
          
          <div className="-mr-2 -my-2 md:hidden">
            <Button
              variant="ghost"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-700 hover:text-primary-600 transition-colors">
              {tNav("features")}
            </a>
            <a href="#screenshots" className="text-gray-700 hover:text-primary-600 transition-colors">
              {tNav("screenshots")}
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-primary-600 transition-colors">
              {tNav("howItWorks")}
            </a>
            <a
              href="https://github.com/AhmedTrb/Project-Management-web-app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              {tNav("github")}
            </a>
            <LanguageSwitcher className="hidden lg:block" />
          </nav>
          
          <div className="hidden md:flex items-center justify-end md:flex-1 lg:w-0">
            
                <Button 
                variant="outline" 
                className="mr-4 border-secondary-600 text-secondary-600 hover:bg-secondary-50"
                onClick={() => router.push("/authentication")}
                >
                {tAuth("signIn")}
                </Button>
            
            
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="absolute top-0 inset-x-0 p-2 transition transform origin-top-right md:hidden">
          <div className="rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-white divide-y-2 divide-gray-50">
            <div className="pt-5 pb-6 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <Logo size="lg" />
                </div>
                <div className="-mr-2">
                  <Button
                    variant="ghost"
                    onClick={() => setIsMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              <div className="mt-6">
                <nav className="grid gap-y-8">
                  <a
                    href="#features"
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {tNav("features")}
                  </a>
                  <a
                    href="#screenshots"
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {tNav("screenshots")}
                  </a>
                  <a
                    href="#how-it-works"
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {tNav("howItWorks")}
                  </a>
                  <a 
                    href="https://github.com/AhmedTrb/Project-Management-web-app" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    {tNav("github")}
                  </a>
                </nav>
              </div>
            </div>
            <div className="py-6 px-5 space-y-6">
              <LanguageSwitcher className="w-full" />
              <Link href="/authentication" onClick={() => setIsMenuOpen(false)}>
                <Button 
                  variant="outline" 
                  className="w-full border-secondary-600 text-secondary-600 hover:bg-primary-50"
                >
                  {tAuth("signIn")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default NavBar;

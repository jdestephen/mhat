"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "./LanguageContext";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "es" ? "en" : "es");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40 transition-shadow">
                <span className="text-white font-bold text-lg leading-none">N</span>
              </div>
              <span className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                Numa
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors">{t('features')}</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors">{t('howItWorks')}</a>
            
            <div className="flex items-center gap-4 border-l border-slate-200 pl-8 ml-2">
              {/* Language Toggle */}
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors"
                aria-label="Toggle language"
              >
                <Globe className="h-4 w-4" />
                <span>{language === 'es' ? 'EN' : 'ES'}</span>
              </button>

              <Link href="/auth/login">
                <Button variant="ghost" className="text-slate-600 hover:text-teal-700 hover:bg-teal-50">{t('login')}</Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20">
                  {t('getStarted')}
                </Button>
              </Link>
            </div>
          </nav>

          {/* Mobile menu button & Language Toggle */}
          <div className="md:hidden flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-teal-600"
            >
              <Globe className="h-4 w-4" />
              <span>{language === 'es' ? 'EN' : 'ES'}</span>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-600 hover:text-teal-600 p-2"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 shadow-xl">
          <div className="px-4 pt-2 pb-6 space-y-4">
            <a 
              href="#features" 
              className="block px-3 py-2 text-base font-medium text-slate-700 hover:text-teal-600 hover:bg-slate-50 rounded-md"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('features')}
            </a>
            <a 
              href="#how-it-works" 
              className="block px-3 py-2 text-base font-medium text-slate-700 hover:text-teal-600 hover:bg-slate-50 rounded-md"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('howItWorks')}
            </a>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center">{t('login')}</Button>
              </Link>
              <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full justify-center bg-teal-600 hover:bg-teal-700 text-white">{t('getStarted')}</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

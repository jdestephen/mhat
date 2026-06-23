"use client";

import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg leading-none">N</span>
              </div>
              <span className="font-bold text-2xl tracking-tight text-slate-900">
                Numa
              </span>
            </Link>
            <p className="text-slate-500 max-w-sm mb-6">
              {t('footerDesc')}
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">{t('product')}</h3>
            <ul className="space-y-3">
              <li><a href="#features" className="text-slate-500 hover:text-teal-600 transition-colors">{t('features')}</a></li>
              <li><a href="#how-it-works" className="text-slate-500 hover:text-teal-600 transition-colors">{t('howItWorks')}</a></li>
              <li><a href="#" className="text-slate-500 hover:text-teal-600 transition-colors">{t('security')}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-4">{t('company')}</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-slate-500 hover:text-teal-600 transition-colors">{t('about')}</a></li>
              <li><a href="#" className="text-slate-500 hover:text-teal-600 transition-colors">{t('contact')}</a></li>
              <li><a href="#" className="text-slate-500 hover:text-teal-600 transition-colors">{t('privacy')}</a></li>
              <li><a href="#" className="text-slate-500 hover:text-teal-600 transition-colors">{t('terms')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            {t('copyright', { year: String(new Date().getFullYear()) })}
          </p>
          <div className="text-slate-400 text-sm">
            {t('designedFor')}
          </div>
        </div>
      </div>
    </footer>
  );
}

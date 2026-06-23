"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Activity, Users } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative pt-30 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-50/50 via-white to-white"></div>
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 opacity-20 -z-10">
        <div className="w-[800px] h-[800px] rounded-full bg-gradient-to-br from-teal-400 to-blue-400 blur-3xl"></div>
      </div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 opacity-20 -z-10">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-400 to-emerald-300 blur-3xl"></div>
      </div>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-sm font-medium text-teal-800 mb-8 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
          {t('badge')}
        </div>
        
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 max-w-4xl mx-auto leading-[1.1]">
          {t('heroTitle1')}<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">{t('heroTitle2')}</span>
        </h1>
        
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          {t('heroDesc')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/auth/register">
            <Button size="lg" className="h-14 px-8 text-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xl shadow-teal-600/20 group rounded-xl">
              {t('getStartedFree')}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl">
              {t('learnMore')}
            </Button>
          </Link>
        </div>

        {/* Quick stats / trust indicators */}
        <div className="mt-20 pt-10 border-t border-slate-200/60 grid grid-cols-2 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
            <ShieldCheck className="h-6 w-6 text-teal-600" />
            <span className="text-sm font-medium">{t('statSecurity')}</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
            <Users className="h-6 w-6 text-teal-600" />
            <span className="text-sm font-medium">{t('statFamily')}</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 text-slate-600 col-span-2 md:col-span-1">
            <Activity className="h-6 w-6 text-teal-600" />
            <span className="text-sm font-medium">{t('statSharing')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { UserPlus, FileHeart, Share2 } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      title: t('s1Title'),
      description: t('s1Desc'),
      icon: UserPlus,
    },
    {
      title: t('s2Title'),
      description: t('s2Desc'),
      icon: FileHeart,
    },
    {
      title: t('s3Title'),
      description: t('s3Desc'),
      icon: Share2,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white relative overflow-hidden">
      {/* Decorative line for desktop */}
      <div className="hidden md:block absolute top-[50%] left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-teal-100 to-transparent -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {t('hiwTitle')}
          </h2>
          <p className="text-lg text-slate-600">
            {t('hiwDesc')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          {steps.map((step, index) => (
            <div key={index} className="relative flex flex-col items-center text-center">
              {/* Number Badge */}
              <div className="absolute -top-4 -left-2 w-10 h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center font-bold text-slate-400 z-10 shadow-sm">
                {index + 1}
              </div>
              
              {/* Icon Container */}
              <div className="w-24 h-24 rounded-full bg-teal-50 border-8 border-white flex items-center justify-center mb-8 shadow-lg shadow-teal-100/50 relative z-0">
                <step.icon className="h-10 w-10 text-teal-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed max-w-xs">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

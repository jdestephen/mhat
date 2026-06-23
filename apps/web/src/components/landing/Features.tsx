"use client";

import { Shield, Users, Activity, FileText, Smartphone, Lock } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export function Features() {
  const { t } = useLanguage();

  const features = [
    {
      name: t('f1Title'),
      description: t('f1Desc'),
      icon: Shield,
      color: "bg-blue-50 text-blue-600",
    },
    {
      name: t('f2Title'),
      description: t('f2Desc'),
      icon: Users,
      color: "bg-teal-50 text-teal-600",
    },
    {
      name: t('f3Title'),
      description: t('f3Desc'),
      icon: Activity,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      name: t('f4Title'),
      description: t('f4Desc'),
      icon: FileText,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      name: t('f5Title'),
      description: t('f5Desc'),
      icon: Smartphone,
      color: "bg-purple-50 text-purple-600",
    },
    {
      name: t('f6Title'),
      description: t('f6Desc'),
      icon: Lock,
      color: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-teal-600 font-semibold tracking-wide uppercase text-sm mb-3">{t('featuresSubtitle')}</h2>
          <p className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {t('featuresTitle')}
          </p>
          <p className="text-lg text-slate-600">
            {t('featuresDesc')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md hover:border-teal-100 transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${feature.color} group-hover:scale-110 transition-transform`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.name}</h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

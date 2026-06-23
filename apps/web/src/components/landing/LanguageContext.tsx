"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "es" | "en";

interface Translations {
  [key: string]: {
    en: string;
    es: string;
  };
}

// Translations dictionary for the landing page
export const landingTranslations = {
  // Navbar
  features: { en: "Features", es: "Características" },
  howItWorks: { en: "How it works", es: "Cómo funciona" },
  login: { en: "Log in", es: "Iniciar sesión" },
  getStarted: { en: "Get Started", es: "Comenzar" },
  
  // Hero
  badge: { en: "Your Health, Your Control", es: "Tu Salud, Tu Control" },
  heroTitle1: { en: "Your family’s health, ", es: "Toda la salud de tu familia, "}, 
  heroTitle2: { en: "organized in one place.", es: "organizada en un solo lugar." },
  heroDesc: { 
    en: "Numa lets you securely store, manage, and share medical records, so you and your doctors have the right information when you need it most.", 
    es: "Numa te permite guardar, administrar y compartir registros médicos de forma segura, para que tú y tus médicos tengan la información correcta cuando más la necesitan." 
  },
  getStartedFree: { en: "Get Started Free", es: "Comienza Gratis" },
  learnMore: { en: "Learn more", es: "Saber más" },
  statSecurity: { en: "Bank-level Security", es: "Seguridad Bancaria" },
  statFamily: { en: "Family Accounts", es: "Cuentas Familiares" },
  statSharing: { en: "Instant Sharing", es: "Compartir al Instante" },

  // Features
  featuresSubtitle: { en: "Why Choose Numa", es: "Por qué elegir Numa" },
  featuresTitle: { en: "Everything you need to manage your health", es: "Todo lo que necesitas para gestionar tu salud" },
  featuresDesc: { 
    en: "We've built a comprehensive platform that simplifies how you store, track, and share your medical history.", 
    es: "Hemos construido una plataforma integral que simplifica cómo almacenas, rastreas y compartes tu historial médico." 
  },
  f1Title: { en: "Patient-Controlled Data", es: "Datos manejados por el Paciente" },
  f1Desc: { en: "You own your data. Decide exactly what information to share and with whom, putting you in the driver's seat of your healthcare journey.", es: "Tú eres dueño de tus datos. Decide exactamente qué información compartir y con quién, poniéndote al mando de tu viaje de atención médica." },
  f2Title: { en: "Family Management", es: "Gestión Familiar" },
  f2Desc: { en: "Manage medical records for your entire family from a single account. Perfect for parents keeping track of their children's health histories.", es: "Administra los registros médicos de toda tu familia desde una sola cuenta. Perfecto para padres que llevan el control del historial de salud de sus hijos." },
  f3Title: { en: "Seamless Doctor Collaboration", es: "Colaboración Fluida con Médicos" },
  f3Desc: { en: "Share your complete medical history with new or existing doctors instantly, reducing redundant paperwork and improving care quality.", es: "Comparte tu historial médico completo con médicos nuevos o existentes al instante, reduciendo el papeleo redundante y mejorando la calidad de la atención." },
  f4Title: { en: "Comprehensive Records", es: "Registros Integrales" },
  f4Desc: { en: "Store allergies, medications, past surgeries, and ongoing conditions. Never forget an important medical detail again.", es: "Almacena alergias, medicamentos, cirugías pasadas y condiciones continuas. Nunca vuelvas a olvidar un detalle médico importante." },
  f5Title: { en: "Access Anywhere", es: "Acceso en Cualquier Lugar" },
  f5Desc: { en: "Your health information is securely accessible from any device, whether you're at home or in the emergency room.", es: "Tu información de salud es accesible de forma segura desde cualquier dispositivo, ya sea que estés en casa o en la sala de emergencias." },
  f6Title: { en: "Privacy First", es: "Privacidad Primero" },
  f6Desc: { en: "Built with industry-leading security practices to ensure your sensitive medical information remains private and protected at all times.", es: "Construido con prácticas de seguridad líderes en la industria para garantizar que tu información médica confidencial permanezca privada y protegida en todo momento." },

  // How it Works
  hiwTitle: { en: "How it works", es: "Cómo funciona" },
  hiwDesc: { en: "Getting started with Numa is simple. Take control of your health records in three easy steps.", es: "Comenzar con Numa es simple. Toma el control de tus registros de salud en tres sencillos pasos." },
  s1Title: { en: "Create your profile", es: "Crea tu perfil" },
  s1Desc: { en: "Sign up in seconds and set up your personal health profile. It's completely free and highly secure.", es: "Regístrate en segundos y configura tu perfil de salud personal. Es completamente gratis y altamente seguro." },
  s2Title: { en: "Add your history", es: "Agrega tu historial" },
  s2Desc: { en: "Input your medications, allergies, conditions, and past surgeries. You can also add profiles for your dependents.", es: "Ingresa tus medicamentos, alergias, condiciones y cirugías pasadas. También puedes agregar perfiles para tus dependientes." },
  s3Title: { en: "Share securely", es: "Comparte de forma segura" },
  s3Desc: { en: "Generate secure, temporary access links for your healthcare providers before appointments to ensure they have the full picture.", es: "Genera enlaces de acceso temporales y seguros para tus proveedores de atención médica antes de las citas para asegurarte de que tengan el panorama completo." },

  // Footer
  footerDesc: { en: "Empowering patients with complete control over their medical history. Secure, accessible, and designed for your family.", es: "Empoderando a los pacientes con control completo sobre su historial médico. Seguro, accesible y diseñado para tu familia." },
  product: { en: "Product", es: "Producto" },
  security: { en: "Security", es: "Seguridad" },
  company: { en: "Company", es: "Empresa" },
  about: { en: "About", es: "Acerca de" },
  contact: { en: "Contact", es: "Contacto" },
  privacy: { en: "Privacy Policy", es: "Política de Privacidad" },
  terms: { en: "Terms of Service", es: "Términos de Servicio" },
  copyright: { en: "© {year} Numa. All rights reserved.", es: "© {year} Numa. Todos los derechos reservados." },
  designedFor: { en: "Designed for healthcare control.", es: "Diseñado para el control de la salud." }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof landingTranslations, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to Spanish
  const [language, setLanguage] = useState<Language>("es");

  const t = (key: keyof typeof landingTranslations, params?: Record<string, string>) => {
    let text = landingTranslations[key]?.[language] || key;
    
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Footer } from "@/components/landing/Footer";
import { LanguageProvider } from "@/components/landing/LanguageContext";

export default function Home() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-white selection:bg-teal-100 selection:text-teal-900">
        <Navbar />
        
        <main>
          <Hero />
          <Features />
          <HowItWorks />
        </main>

        <Footer />
      </div>
    </LanguageProvider>
  );
}

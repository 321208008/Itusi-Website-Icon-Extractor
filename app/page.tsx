"use client";

import { useState } from "react";
import { IconExtractor } from "@/components/IconExtractor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import { translations } from "@/lib/translations";
import { GoogleAdsense } from "@/components/GoogleAdsense";

export default function Home() {
  const [language, setLanguage] = useState("en");
  const t = translations[language as keyof typeof translations];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <Logo />
          <div className="flex gap-2">
            <LanguageToggle
              onLanguageChange={setLanguage}
              currentLanguage={language}
            />
            <ThemeToggle />
          </div>
        </header>
        
        <main className="space-y-8">
          {/* 顶部横幅广告 */}
          <GoogleAdsense
            slot="2660025805"
            style={{ display: 'block' }}
            format="auto"
            responsive={true}
            className="my-4"
          />

          <IconExtractor language={language} />

          {/* 底部横幅广告 */}
          <GoogleAdsense
            slot="2660025805"
            style={{ display: 'block' }}
            format="auto"
            responsive={true}
            className="my-4"
          />
        </main>
      </div>
    </div>
  );
}
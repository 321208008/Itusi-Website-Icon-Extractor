"use client";

import { useState } from "react";
import { IconExtractor } from "@/components/IconExtractor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import { translations } from "@/lib/translations";

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
        
        <main>
          <IconExtractor language={language} />
        </main>
      </div>
    </div>
  );
}
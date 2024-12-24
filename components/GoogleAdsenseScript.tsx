'use client';

import Script from 'next/script';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function GoogleAdsenseScript() {
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
      onLoad={() => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID,
            enable_page_level_ads: true
          });
        } catch (error) {
          console.error('AdSense error:', error);
        }
      }}
    />
  );
} 
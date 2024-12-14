import Link from 'next/link';
import { Image } from 'lucide-react';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <div className="p-1 bg-primary rounded-lg">
        <Image className="w-6 h-6 text-primary-foreground" />
      </div>
      <span className="font-bold text-xl">Website Icon Extractor</span>
    </Link>
  );
} 
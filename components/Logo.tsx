import { Image } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="p-1 bg-primary rounded-lg">
        <Image className="w-6 h-6 text-primary-foreground" />
      </div>
      <span className="font-bold text-xl">Icon Extractor</span>
    </div>
  );
} 
"use client";

import { useState } from "react";
import { Download, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { translations } from "@/lib/translations";
import { toast } from "sonner";

type IconFormat = 'png' | 'jpg' | 'webp' | 'ico';

interface IconExtractorProps {
  language: string;
}

export function IconExtractor({ language }: IconExtractorProps) {
  const t = translations[language as keyof typeof translations];
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<IconFormat>('png');
  const [size, setSize] = useState(32);
  const [transparent, setTransparent] = useState(true);
  const [isIcoSource, setIsIcoSource] = useState(false);

  const handleExtract = async () => {
    if (!url) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/extract?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (data.success) {
        setIconUrl(data.iconUrl);
        setIsIcoSource(data.iconUrl.toLowerCase().endsWith('.ico'));
        // 如果源是ICO文件，默认使用PNG格式
        if (data.iconUrl.toLowerCase().endsWith('.ico')) {
          setFormat('png');
        }
        toast.success(t.success);
      } else {
        toast.error(t.error);
      }
    } catch (error) {
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!iconUrl) return;
    
    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: iconUrl,
          format,
          size,
          transparent,
        }),
      });

      if (!response.ok) {
        throw new Error('转换失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // 如果源是ICO且选择了ICO格式，实际下载PNG
      const downloadFormat = (isIcoSource && format === 'ico') ? 'png' : format;
      a.download = `icon.${downloadFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(t.downloadSuccess);
    } catch (error) {
      toast.error(t.error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
      <Card className="w-full max-w-2xl p-6">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t.enterUrl}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={handleExtract} disabled={loading}>
              <Upload className="mr-2 h-4 w-4" />
              {loading ? t.loading : t.extract}
            </Button>
          </div>

          {iconUrl && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {t.favicon}
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t.download}
                </Button>
              </div>
              <div className="border rounded p-4 bg-muted/50 flex items-center justify-center min-h-[120px]">
                <img
                  src={iconUrl}
                  alt="Icon preview"
                  style={{
                    width: size,
                    height: size,
                    objectFit: 'contain',
                    background: transparent ? 'transparent' : 'white'
                  }}
                />
              </div>
              {isIcoSource && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t.icoSourceWarning}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.format}</label>
                  <Select 
                    value={format} 
                    onValueChange={(value) => setFormat(value as IconFormat)}
                    disabled={isIcoSource && format === 'ico'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="jpg">JPG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
                      <SelectItem value="ico" disabled={isIcoSource}>ICO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.size}</label>
                  <Slider
                    min={16}
                    max={512}
                    step={16}
                    value={[size]}
                    onValueChange={(value) => setSize(value[0])}
                  />
                  <div className="text-sm text-muted-foreground text-right">
                    {size}px
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t.transparent}</label>
                <Switch
                  checked={transparent}
                  onCheckedChange={setTransparent}
                  disabled={format === 'jpg'}
                />
              </div>
              <div className="text-sm text-muted-foreground break-all">
                {iconUrl}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
export interface IconData {
  url: string;
  formats: string[];
  size: number;
}

export interface Language {
  code: string;
  name: string;
  translations: Record<string, string>;
}

export type SupportedFormat = 'png' | 'jpg' | 'ico' | 'svg';
export type SupportedSize = 16 | 32 | 48 | 64 | 128 | 256;
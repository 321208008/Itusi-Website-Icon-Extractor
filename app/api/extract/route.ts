import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

async function getFaviconUrls(url: string) {
  try {
    const baseUrl = new URL(url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();
    
    // 收集所有可能的图标URL
    const iconUrls = new Set<string>();
    
    // 添加所有可能的默认图标路径
    const defaultPaths = [
      '/favicon.ico',
      '/favicon.png',
      '/apple-touch-icon.png',
      '/apple-touch-icon-precomposed.png',
      '/assets/favicon.ico',
      '/static/favicon.ico',
      '/public/favicon.ico',
      '/images/favicon.ico'
    ];
    
    for (const path of defaultPaths) {
      iconUrls.add(new URL(path, baseUrl).toString());
    }
    
    if (html) {
      // 从HTML中提取所有图标链接
      const patterns = [
        { regex: /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*>/gi },
        { regex: /<link[^>]*rel=["']apple-touch-icon["'][^>]*>/gi },
        { regex: /<link[^>]*rel=["']apple-touch-icon-precomposed["'][^>]*>/gi }
      ];
      
      const urlPatterns = [
        /href=["']([^"']+)["']/i,
        /content=["']([^"']+)["']/i
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.regex.exec(html)) !== null) {
          for (const urlPattern of urlPatterns) {
            const urlMatch = urlPattern.exec(match[0]);
            if (urlMatch && urlMatch[1]) {
              try {
                const iconUrl = new URL(urlMatch[1], baseUrl).toString();
                iconUrls.add(iconUrl);
              } catch (e) {
                console.error('Invalid URL:', urlMatch[1]);
              }
            }
          }
        }
      }
    }
    
    return Array.from(iconUrls);
  } catch (error) {
    console.error('Error fetching icons:', error);
    return [];
  }
}

async function checkImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const contentType = response.headers.get('content-type');
    if (!contentType) return false;
    
    // 检查更多的图片MIME类型
    const validImageTypes = [
      'image/',
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/ico',
      'image/icon',
      'text/ico',
      'application/ico',
      'application/octet-stream'
    ];
    
    return validImageTypes.some(type => contentType.toLowerCase().includes(type));
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url).searchParams.get('url');

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    // 确保URL格式正确
    let formattedUrl = url;
    if (!url.startsWith('http')) {
      formattedUrl = `https://${url}`;
    }

    try {
      new URL(formattedUrl);
    } catch {
      return NextResponse.json({ success: false, error: '无效的URL' }, { status: 400 });
    }

    const iconUrls = await getFaviconUrls(formattedUrl);
    console.log('Found icon URLs:', iconUrls);
    
    // 检查每个URL是否可访问
    for (const iconUrl of iconUrls) {
      console.log('Checking URL:', iconUrl);
      if (await checkImageUrl(iconUrl)) {
        console.log('Valid icon found:', iconUrl);
        return NextResponse.json({
          success: true,
          iconUrl,
        });
      }
    }
    
    // 如果没有找到可用的图标，使用Google的服务作为后备
    console.log('No valid icons found, using Google Favicon service');
    const domain = new URL(formattedUrl).hostname;
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    
    return NextResponse.json({
      success: true,
      iconUrl: googleFaviconUrl,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: '无法提取图标' },
      { status: 500 }
    );
  }
}
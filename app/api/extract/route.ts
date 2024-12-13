import { NextResponse } from 'next/server';

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, 3000);
    return response.ok;
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

    // 尝试直接访问网站
    try {
      const isAccessible = await checkUrl(formattedUrl);
      if (!isAccessible) {
        throw new Error('Website not accessible');
      }
    } catch (error) {
      console.error('Error accessing website:', error);
      // 如果无法访问网站，直接使用Google的服务
      const domain = new URL(formattedUrl).hostname;
      return NextResponse.json({
        success: true,
        iconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      });
    }

    // 构建可能的图标URL列表
    const baseUrl = new URL(formattedUrl);
    const iconUrls = [
      new URL('/favicon.ico', baseUrl).toString(),
      new URL('/favicon.png', baseUrl).toString(),
      new URL('/apple-touch-icon.png', baseUrl).toString(),
      new URL('/apple-touch-icon-precomposed.png', baseUrl).toString(),
    ];

    // 尝试获取网页内容以查找更多图标
    try {
      const response = await fetchWithTimeout(formattedUrl);
      const html = await response.text();
      
      // 从HTML中提取图标链接
      const linkRegex = /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        try {
          const iconUrl = new URL(match[1], baseUrl).toString();
          if (!iconUrls.includes(iconUrl)) {
            iconUrls.push(iconUrl);
          }
        } catch (e) {
          console.error('Invalid URL:', match[1]);
        }
      }
    } catch (error) {
      console.error('Error fetching HTML:', error);
    }

    console.log('Found icon URLs:', iconUrls);
    
    // 检查每个URL是否可访问
    for (const iconUrl of iconUrls) {
      console.log('Checking URL:', iconUrl);
      try {
        const isValid = await checkUrl(iconUrl);
        if (isValid) {
          console.log('Valid icon found:', iconUrl);
          return NextResponse.json({
            success: true,
            iconUrl,
          });
        }
      } catch (error) {
        console.error('Error checking URL:', iconUrl, error);
      }
    }
    
    // 如果没有找到可用的图标，使用Google的服务作为后备
    console.log('No valid icons found, using Google Favicon service');
    const domain = new URL(formattedUrl).hostname;
    return NextResponse.json({
      success: true,
      iconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: '无法提取图标' },
      { status: 500 }
    );
  }
}
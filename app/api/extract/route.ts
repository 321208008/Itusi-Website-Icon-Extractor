import { NextResponse } from 'next/server';

async function fetchWithTimeout(url: string, timeout = 5000, retries = 2): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      console.log(`尝试获取 ${url} (第 ${i + 1}/${retries} 次)`);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(id);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(id);
      lastError = error as Error;
      
      if (i < retries - 1) {
        console.log(`获取失败，${i + 1}/${retries}，等待重试...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error('获取失败');
}

function formatUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ success: false, error: '需要URL参数' }, { status: 400 });
    }

    url = formatUrl(url);
    
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: '无效的URL格式' 
      }, { status: 400 });
    }

    const domain = new URL(url).hostname;
    const iconMethods = [
      {
        name: '直接获取',
        url: `https://${domain}/favicon.ico`
      },
      {
        name: 'Google服务',
        url: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
      }
    ];

    for (const method of iconMethods) {
      try {
        console.log(`尝试使用${method.name}获取图标: ${method.url}`);
        const response = await fetchWithTimeout(method.url);
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('image/')) {
          console.log(`成功通过${method.name}获取图标`);
          return NextResponse.json({
            success: true,
            iconUrl: response.url
          });
        }
      } catch (error) {
        console.error(`${method.name}获取失败:`, error);
        continue;
      }
    }

    throw new Error('无法获取网站图标');
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取图标时出错'
      },
      { status: 500 }
    );
  }
}
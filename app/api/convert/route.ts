import { NextResponse } from 'next/server';
import ICO from 'icojs';
import sharp from 'sharp';

async function fetchWithTimeout(url: string, timeout = 10000, retries = 2): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`尝试下载 ${url} (第 ${i + 1} 次尝试)`);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        cache: 'no-store'
      });
      clearTimeout(id);
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 检查内容类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('image/')) {
        throw new Error('返回的不是图片');
      }
      
      return response;
    } catch (error: unknown) {
      if (i === retries - 1) {
        clearTimeout(id);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('请求超时，请稍后重试');
        }
        throw error;
      }
      console.log(`第 ${i + 1} 次尝试失败，准备重试...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('所有重试都失败了');
}

async function tryFetchIcon(url: string): Promise<Response> {
  const errors: string[] = [];

  // 首先尝试直接从网站获取图标
  try {
    const domain = new URL(url).hostname;
    const directUrl = `https://${domain}/favicon.ico`;
    console.log('尝试直接获取favicon:', directUrl);
    const response = await fetchWithTimeout(directUrl, 5000, 1);
    console.log('成功从网站直接获取favicon');
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    errors.push(`直接获取失败: ${errorMessage}`);
    console.log('直接获取favicon失败，尝试其他方法');
  }

  // 如果直接获取失败，尝试使用Google的服务
  try {
    const domain = new URL(url).hostname;
    const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    console.log('尝试使用Google服务获取favicon:', googleUrl);
    const response = await fetchWithTimeout(googleUrl, 8000, 2);
    console.log('成功从Google服务获取favicon');
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    errors.push(`Google服务获取失败: ${errorMessage}`);
    console.log('Google服务获取失败');
  }

  // 如果都失败了，抛出详细错误
  throw new Error(`无法获取网站图标:\n${errors.join('\n')}`);
}

async function processImage(buffer: Buffer, size?: number, format = 'png'): Promise<{ buffer: Buffer; contentType: string }> {
  try {
    let image = sharp(buffer);
    const metadata = await image.metadata();
    
    // 调整图像大小
    if (size) {
      image = image.resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      });
    }

    // 根据格式转换
    let contentType: string;
    switch (format.toLowerCase()) {
      case 'png':
        buffer = await image.png().toBuffer();
        contentType = 'image/png';
        break;
      case 'jpg':
      case 'jpeg':
        buffer = await image
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: 90 })
          .toBuffer();
        contentType = 'image/jpeg';
        break;
      case 'webp':
        buffer = await image.webp({ quality: 90 }).toBuffer();
        contentType = 'image/webp';
        break;
      default:
        buffer = await image.png().toBuffer();
        contentType = 'image/png';
    }

    return { buffer, contentType };
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('图像处理失败');
  }
}

export async function POST(request: Request) {
  try {
    const { url, size, format } = await request.json();

    if (!url) {
      return NextResponse.json({ success: false, error: '需要图标URL' }, { status: 400 });
    }

    // 下载图标
    let response: Response;
    try {
      response = await tryFetchIcon(url);
    } catch (error: unknown) {
      console.error('Error fetching icon:', error);
      const errorMessage = error instanceof Error ? error.message : '无法下载图标';
      return NextResponse.json({ 
        success: false, 
        error: errorMessage
      }, { status: 500 });
    }

    // 获取图标的内容类型
    const contentType = response.headers.get('content-type') || 'image/x-icon';
    
    // 获取图标数据
    const arrayBuffer = await response.arrayBuffer();
    
    // 如果是ICO格式，尝试转换为PNG
    if (contentType.includes('x-icon') || contentType.includes('vnd.microsoft.icon')) {
      try {
        const images = await ICO.parseICO(Buffer.from(arrayBuffer), 'image/png');
        if (images && images.length > 0) {
          // 使用最大尺寸的图标
          const largestIcon = images.reduce((prev, curr) => 
            (curr.width > prev.width) ? curr : prev
          );
          
          // 处理图像
          const { buffer, contentType: processedContentType } = await processImage(
            Buffer.from(largestIcon.buffer),
            size,
            format
          );
          
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': processedContentType,
              'Content-Disposition': `attachment; filename=icon.${format || 'png'}`
            }
          });
        }
      } catch (error) {
        console.error('Error parsing ICO:', error);
      }
    }
    
    // 处理其他格式的图像
    try {
      const { buffer, contentType: processedContentType } = await processImage(
        Buffer.from(arrayBuffer),
        size,
        format
      );
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': processedContentType,
          'Content-Disposition': `attachment; filename=icon.${format || contentType.split('/')[1]}`
        }
      });
    } catch (error) {
      console.error('Error processing image:', error);
      // 如果处理失败，返回原始图像
      return new NextResponse(Buffer.from(arrayBuffer), {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename=icon.${contentType.split('/')[1]}`
        }
      });
    }
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : '处理图标时出错';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
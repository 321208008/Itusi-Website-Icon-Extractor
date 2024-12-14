import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const { url, format, size, transparent } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: '缺少URL参数' },
        { status: 400 }
      );
    }

    // 构建 Cloudinary 转换参数
    const transformations: any[] = [
      { width: size, height: size, crop: 'fit' },
    ];

    // 设置输出格式
    if (format !== 'ico') {
      transformations.push({ format });
    }

    // 如果不需要透明背景，添加白色背景
    if (!transparent && format !== 'jpg') {
      transformations.push({ effect: 'background', background: 'white' });
    }

    try {
      // 上传并转换图像
      const result = await cloudinary.uploader.upload(url, {
        transformation: transformations,
        folder: 'icons',
      });

      // 获取转换后的URL
      const transformedUrl = result.secure_url;

      // 获取图像数据
      const response = await fetch(transformedUrl);
      if (!response.ok) {
        throw new Error('无法获取转换后的图像');
      }

      const buffer = await response.arrayBuffer();

      // 返回转换后的图像
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': `image/${format === 'ico' ? 'png' : format}`,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } catch (error) {
      console.error('Cloudinary错误:', error);
      return NextResponse.json(
        { 
          error: '图像处理失败',
          details: error instanceof Error ? error.message : '未知错误'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('请求错误:', error);
    return NextResponse.json(
      { 
        error: '请求处理失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 400 }
    );
  }
}
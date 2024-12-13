import { NextResponse } from 'next/server';
import sharp from 'sharp';
import * as ICO from 'icojs';

export async function POST(request: Request) {
  try {
    const { url, format, size, transparent } = await request.json();

    if (!url) {
      return NextResponse.json({ success: false, error: '需要图标URL' }, { status: 400 });
    }

    // 下载图标
    const response = await fetch(url);
    const arrayBuffer = await response.blob().then(blob => blob.arrayBuffer());
    
    // 如果输入是ICO格式，先转换为PNG
    let inputBuffer: Buffer;
    if (url.toLowerCase().endsWith('.ico')) {
      try {
        // 使用 ICO.parse 而不是 icojs.parse
        const images = await ICO.parse(Buffer.from(arrayBuffer));
        if (images && images.length > 0) {
          // 使用最大尺寸的图标
          const largestIcon = images.reduce((prev, curr) => 
            (curr.width > prev.width) ? curr : prev
          );
          inputBuffer = Buffer.from(largestIcon.buffer);
        } else {
          throw new Error('No valid icons found in ICO file');
        }
      } catch (error) {
        console.error('Error parsing ICO:', error);
        // 如果ICO解析失败，尝试直接使用PNG格式
        inputBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      inputBuffer = Buffer.from(arrayBuffer);
    }

    let image = sharp(inputBuffer);

    // 获取图像信息
    try {
      const metadata = await image.metadata();
      const targetSize = size || metadata.width || 32;

      // 调整大小
      image = image.resize(targetSize, targetSize, {
        fit: 'contain',
        background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255, alpha: 1 }
      });

      // 根据格式转换
      let buffer: Buffer;
      let contentType: string;

      switch (format.toLowerCase()) {
        case 'png':
          buffer = await image.png({ palette: true }).toBuffer();
          contentType = 'image/png';
          break;
        case 'jpg':
        case 'jpeg':
          // 对于JPG，确保使用白色背景
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
        case 'ico':
          try {
            // 生成多个尺寸的PNG
            const sizes = [16, 32, 48];
            const pngBuffers = await Promise.all(
              sizes.map(s => 
                image
                  .resize(s, s, {
                    fit: 'contain',
                    background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255, alpha: 1 }
                  })
                  .png()
                  .toBuffer()
              )
            );

            // 使用第一个尺寸作为预览
            buffer = pngBuffers[0];
            contentType = 'image/png'; // 改为PNG格式，因为我们实际上返回的是PNG
          } catch (error) {
            console.error('Error creating ICO:', error);
            // 如果创建失败，返回PNG格式
            buffer = await image.png().toBuffer();
            contentType = 'image/png';
          }
          break;
        default:
          return NextResponse.json({ success: false, error: '不支持的格式' }, { status: 400 });
      }

      // 返回转换后的图片
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename=icon.${format === 'ico' ? 'png' : format.toLowerCase()}`
        }
      });
    } catch (error) {
      console.error('Error processing image:', error);
      // 如果处理失败，尝试直接返回原始图片数据
      return new NextResponse(inputBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'attachment; filename=icon.png'
        }
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: '转换图标时出错' },
      { status: 500 }
    );
  }
}
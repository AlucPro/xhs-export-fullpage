import html2canvas from 'html2canvas';
import { PostData } from '../types';
import { sanitizeFilename } from '../utils/sanitize';
import { buildExportHTML } from './template';

export async function exportToImage(
  post: PostData,
  options?: { onProgress?: (msg: string) => void }
): Promise<void> {
  const log = options?.onProgress ?? (() => {});
  log('生成 HTML...');

  const html = buildExportHTML(post);

  log('渲染中...');

  // Create a temporary container off-screen
  const container = document.createElement('div');
  container.id = '__xhs_export_temp__';
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;z-index:99999;width:750px;background:#fff;';
  container.innerHTML = html;
  document.body.appendChild(container);

  // Wait for images to load inside the container
  const imgs = container.querySelectorAll('img');
  await Promise.all(
    Array.from(imgs).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          // Timeout after 10s per image
          setTimeout(resolve, 10000);
        })
    )
  );

  log('生成图片...');

  try {
    const rawCanvas = await html2canvas(container, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Compress: resize to max 750px wide, maintaining aspect ratio
    const MAX_WIDTH = 750;
    let canvas = rawCanvas;
    if (rawCanvas.width > MAX_WIDTH) {
      const ratio = MAX_WIDTH / rawCanvas.width;
      const targetHeight = Math.round(rawCanvas.height * ratio);
      canvas = document.createElement('canvas');
      canvas.width = MAX_WIDTH;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(rawCanvas, 0, 0, MAX_WIDTH, targetHeight);
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });

    if (!blob) {
      throw new Error('Canvas toBlob returned null');
    }

    const sizeKB = (blob.size / 1024).toFixed(0);
    const filename = `${sanitizeFilename(post.title)}_${post.postId}.png`;
    downloadBlob(blob, filename);
    log(`已保存: ${filename} (${sizeKB}KB)`);
  } finally {
    container.remove();
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

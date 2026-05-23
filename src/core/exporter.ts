import html2canvas from 'html2canvas';
import { PostData } from '../types';
import { sanitizeFilename } from '../utils/sanitize';
import { buildExportHTML } from './template';

export interface ExportProgress {
  step: 'building' | 'loading_images' | 'rendering' | 'saving' | 'done';
  message: string;
  filename?: string;
  sizeKB?: number;
}

export async function exportToImage(
  post: PostData,
  options?: { onProgress?: (p: ExportProgress) => void }
): Promise<{ filename: string; sizeKB: number }> {
  const log = (p: ExportProgress) => options?.onProgress?.(p);

  log({ step: 'building', message: '生成 HTML...' });

  const html = buildExportHTML(post);

  log({ step: 'loading_images', message: '加载图片...' });

  const container = document.createElement('div');
  container.id = '__xhs_export_temp__';
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;z-index:99999;width:750px;background:#fff;';
  container.innerHTML = html;
  document.body.appendChild(container);

  const imgs = container.querySelectorAll('img');
  let loadedCount = 0;
  const totalImgs = imgs.length;

  await Promise.all(
    Array.from(imgs).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            loadedCount++;
            if (totalImgs > 1) log({ step: 'loading_images', message: `加载图片 ${loadedCount}/${totalImgs}...` });
            return resolve();
          }
          img.onload = () => {
            loadedCount++;
            if (totalImgs > 1) log({ step: 'loading_images', message: `加载图片 ${loadedCount}/${totalImgs}...` });
            resolve();
          };
          img.onerror = () => resolve();
          setTimeout(resolve, 10000);
        })
    )
  );

  log({ step: 'rendering', message: '渲染长图...' });

  try {
    const rawCanvas = await html2canvas(container, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const MAX_WIDTH = 750;
    let canvas = rawCanvas;
    if (rawCanvas.width > MAX_WIDTH) {
      const ratio = MAX_WIDTH / rawCanvas.width;
      canvas = document.createElement('canvas');
      canvas.width = MAX_WIDTH;
      canvas.height = Math.round(rawCanvas.height * ratio);
      canvas.getContext('2d')!.drawImage(rawCanvas, 0, 0, MAX_WIDTH, canvas.height);
    }

    log({ step: 'saving', message: '保存图片...' });

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });

    if (!blob) {
      throw new Error('Canvas toBlob returned null');
    }

    const sizeKB = Math.round(blob.size / 1024);
    const filename = `${sanitizeFilename(post.title)}_${post.postId}.png`;
    downloadBlob(blob, filename);

    log({ step: 'done', message: '完成', filename, sizeKB });

    return { filename, sizeKB };
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

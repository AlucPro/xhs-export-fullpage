export function imageUrlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
}

function getImageMimeType(url: string): string {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'jpg':
    case 'jpeg':
    default: return 'image/jpeg';
  }
}

export function imageUrlToBase64ViaCanvas(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL(getImageMimeType(url)));
    };
    img.onerror = () => {
      // Fallback: try fetch + FileReader
      imageUrlToBase64(url).then(resolve).catch(reject);
    };
    img.src = url;
  });
}

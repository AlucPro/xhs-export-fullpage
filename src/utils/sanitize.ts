export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\.{2,}/g, '.')
    .trim()
    .replace(/\.$/, '')
    .slice(0, 200);
}

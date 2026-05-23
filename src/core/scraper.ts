import { PostData } from '../types';

export function scrapePostData(): PostData {
  const postId = extractPostId(window.location.href) || 'unknown';
  const title = scrapeTitle();
  const author = scrapeAuthor();
  const content = scrapeContent();
  const tags = scrapeTags();
  const mediaType = detectMediaType();
  const images = scrapeImages(mediaType);

  return {
    postId,
    title: title || `untitled_${postId}`,
    author,
    content,
    tags,
    mediaType,
    images,
    postUrl: window.location.href,
  };
}

function extractPostId(url: string): string | null {
  const match = url.match(/\/explore\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function scrapeTitle(): string {
  return (
    (document.querySelector('#detail-title') as HTMLElement)?.innerText?.trim() ||
    (document.querySelector('[class*="title"]') as HTMLElement)?.innerText?.trim() ||
    ''
  );
}

function scrapeAuthor(): { name: string; avatar: string } {
  return {
    name:
      (document.querySelector('.username') as HTMLElement)?.innerText?.trim() ||
      (document.querySelector('[class*="username"]') as HTMLElement)?.innerText?.trim() ||
      '',
    avatar:
      (document.querySelector('.avatar img') as HTMLImageElement)?.src ||
      (document.querySelector('.avatar img') as HTMLImageElement)?.dataset?.src ||
      (document.querySelector('[class*="avatar"] img') as HTMLImageElement)?.src ||
      '',
  };
}

function scrapeContent(): string {
  return (
    (document.querySelector('#detail-desc .note-text') as HTMLElement)?.innerText?.trim() ||
    (document.querySelector('#detail-desc') as HTMLElement)?.innerText?.trim() ||
    (document.querySelector('[class*="desc"]') as HTMLElement)?.innerText?.trim() ||
    ''
  );
}

function scrapeTags(): string[] {
  const tagElements = document.querySelectorAll(
    '#detail-desc a[href*="/tag/"], #detail-desc a[href*="/topic/"], [class*="tag"] a'
  );
  return Array.from(tagElements)
    .map((el) => (el as HTMLElement).innerText.trim())
    .filter((t) => t.startsWith('#') || t.length > 0)
    .map((t) => (t.startsWith('#') ? t : `#${t}`));
}

function detectMediaType(): 'image' | 'video' | 'text' {
  if (document.querySelector('video')) return 'video';

  // Check for images in the swiper/carousel
  const swiperImages = document.querySelectorAll('.swiper-slide img, [class*="swiper"] img');
  const carouselImages = document.querySelectorAll('[class*="carousel"] img, [class*="slide"] img');
  const noteImages = document.querySelectorAll(
    '[class*="note"] img, [class*="media"] img'
  );

  if (swiperImages.length > 0 || carouselImages.length > 0 || noteImages.length > 0) {
    return 'image';
  }

  return 'text';
}

function scrapeImages(mediaType: 'image' | 'video' | 'text'): string[] {
  if (mediaType === 'video' || mediaType === 'text') return [];

  const selectors = [
    '.swiper-slide img',
    '[class*="swiper"] img',
    '[class*="carousel"] img',
    '[class*="slide"] img',
    '[class*="media"] img',
    '[class*="note"] img',
  ];

  const seen = new Set<string>();
  const images: string[] = [];

  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((img) => {
      // Skip images inside the comment section
      if (img.closest('.comments-container') || img.closest('[class*="comment"]')) return;

      const src = (img as HTMLImageElement).src || (img as HTMLImageElement).dataset?.src;
      if (src && !seen.has(src) && !isIconOrAvatar(src)) {
        seen.add(src);
        images.push(src);
      }
    });
  }

  return images;
}

function isIconOrAvatar(src: string): boolean {
  return (
    src.includes('avatar') ||
    src.includes('icon') ||
    src.includes('logo') ||
    src.includes('data:image') ||
    src.includes('emoji') ||
    src.includes('badge')
  );
}

// For favorites page
export function scrapeFavoritePostIds(): string[] {
  const ids = new Set<string>();

  document.querySelectorAll('a[href*="/explore/"]').forEach((link) => {
    const href = (link as HTMLAnchorElement).href;
    const match = href.match(/\/explore\/([a-zA-Z0-9]+)/);
    if (match) ids.add(match[1]);
  });

  return Array.from(ids);
}

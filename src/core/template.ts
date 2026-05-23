import { PostData } from '../types';

export function buildExportHTML(post: PostData): string {
  const tagsHtml =
    post.tags.length > 0
      ? post.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')
      : '';

  const imagesHtml =
    post.images.length > 0
      ? post.images.map((src) => `<img src="${esc(src)}" alt="" />`).join('')
      : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{width:750px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:#fff;color:#222;}
.text-section{padding:32px 28px;}
.title{font-size:28px;font-weight:700;line-height:1.4;margin-bottom:20px;}
.author-row{display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #eee;}
.avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;}
.author-name{font-size:16px;font-weight:500;color:#333;}
.content{font-size:18px;line-height:1.8;white-space:pre-wrap;word-break:break-word;margin-bottom:16px;}
.tags-row{display:flex;flex-wrap:wrap;gap:8px;}
.tag{font-size:14px;color:#1a73e8;background:#e8f0fe;padding:4px 12px;border-radius:12px;}
.images-section img{width:100%;display:block;}
</style>
</head>
<body>
<div class="text-section">
  <div class="title">${esc(post.title)}</div>
  <div class="author-row">
    ${post.author.avatar ? `<img class="avatar" src="${esc(post.author.avatar)}" alt="" />` : ''}
    <span class="author-name">${esc(post.author.name)}</span>
  </div>
  <div class="content">${esc(post.content)}</div>
  ${tagsHtml ? `<div class="tags-row">${tagsHtml}</div>` : ''}
</div>
${imagesHtml ? `<div class="images-section">${imagesHtml}</div>` : ''}
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

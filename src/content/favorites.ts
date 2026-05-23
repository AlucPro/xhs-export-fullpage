import { scrapeFavoritePostIds } from '../core/scraper';
import { PostData } from '../types';

const BATCH_BTN_ID = '__xhs_batch_export_btn__';
const PROGRESS_ID = '__xhs_batch_progress__';

const MAX_POSTS = 1000;
const SCROLL_DELAY = 1500;
const MAX_NO_NEW = 5;

function injectBatchButton(): void {
  if (document.getElementById(BATCH_BTN_ID)) return;

  const container = document.createElement('div');
  container.id = '__xhs_export_toolbar__';
  container.style.cssText = `
    position: fixed; top: 16px; right: 16px; z-index: 99999;
    display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
  `;

  const btn = document.createElement('button');
  btn.id = BATCH_BTN_ID;
  btn.textContent = '批量导出收藏';
  btn.style.cssText = `
    background: #ff2442; color: #fff; border: none; border-radius: 8px;
    padding: 10px 20px; font-size: 15px; font-weight: 600;
    cursor: pointer; box-shadow: 0 4px 12px rgba(255,36,66,0.4);
  `;
  btn.onclick = handleBatchExport;

  container.appendChild(btn);
  document.body.appendChild(container);
}

async function handleBatchExport(): Promise<void> {
  const btn = document.getElementById(BATCH_BTN_ID) as HTMLButtonElement;
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = '正在滚动加载收藏列表...';

  try {
    // Step 1: Scroll to load all favorited posts
    const postIds = await collectAllPostIds();
    if (postIds.length === 0) {
      showProgress('未找到收藏帖子', 'error');
      return;
    }

    btn.textContent = `已找到 ${postIds.length} 个帖子，开始导出...`;

    // Step 2: Send to service worker for batch processing
    chrome.runtime.sendMessage(
      { type: 'BATCH_EXPORT', postIds },
      (response: { success: number; failed: number; failures: Array<{ postId: string; error: string }> }) => {
        if (chrome.runtime.lastError) {
          showProgress(`导出出错: ${chrome.runtime.lastError.message}`, 'error');
          return;
        }

        const { success, failed, failures } = response;
        showProgress(
          `导出完成! 成功: ${success}, 失败: ${failed}`,
          failed > 0 ? 'error' : 'success'
        );

        if (failures.length > 0) {
          console.table(failures);
        }
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showProgress(`出错: ${msg}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '批量导出收藏';
  }
}

async function collectAllPostIds(): Promise<string[]> {
  const allIds = new Set<string>();
  let noNewCount = 0;

  while (allIds.size < MAX_POSTS) {
    const before = allIds.size;
    const newIds = scrapeFavoritePostIds();
    newIds.forEach((id) => allIds.add(id));

    if (allIds.size === before) {
      noNewCount++;
      if (noNewCount >= MAX_NO_NEW) break;
    } else {
      noNewCount = 0;
      showProgress(`已找到 ${allIds.size} 个帖子...`);
    }

    // Scroll down
    window.scrollBy(0, window.innerHeight);
    await delay(SCROLL_DELAY);
  }

  return Array.from(allIds);
}

function showProgress(
  message: string,
  type: 'info' | 'success' | 'error' = 'info'
): void {
  let el = document.getElementById(PROGRESS_ID);
  if (!el) {
    const container = document.getElementById('__xhs_export_toolbar__');
    if (!container) return;

    el = document.createElement('div');
    el.id = PROGRESS_ID;
    el.style.cssText = `
      padding: 8px 16px; border-radius: 8px; font-size: 13px;
      color: #333; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      max-width: 300px;
    `;
    container.appendChild(el);
  }

  el.textContent = message;
  if (type === 'success') el.style.color = '#00a870';
  else if (type === 'error') el.style.color = '#e02020';
  else el.style.color = '#333';
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Init
function init(): void {
  // Only activate on favorites tab
  if (window.location.search.includes('tab=fav')) {
    injectBatchButton();
  }
}

init();

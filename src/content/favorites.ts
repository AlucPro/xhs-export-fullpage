import { BatchState } from '../types';

const BATCH_BTN_ID = '__xhs_batch_export_btn__';
const STORAGE_KEY = '__xhs_batch_state__';

const MAX_POSTS = 1000;
const SCROLL_DELAY = 1200;
const MAX_NO_NEW = 6;

function injectBatchButton(): void {
  if (document.getElementById(BATCH_BTN_ID)) return;

  const container = document.createElement('div');
  container.id = '__xhs_export_toolbar__';
  container.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:flex-end;';

  const btn = document.createElement('button');
  btn.id = BATCH_BTN_ID;
  btn.textContent = '批量导出收藏';
  btn.style.cssText =
    'background:#ff2442;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(255,36,66,0.4);';
  btn.onclick = handleBatchExport;

  container.appendChild(btn);
  document.body.appendChild(container);
}

async function handleBatchExport(): Promise<void> {
  const btn = document.getElementById(BATCH_BTN_ID) as HTMLButtonElement;
  if (!btn) return;

  btn.disabled = true;

  // Create progress panel
  const panel = createCollectionPanel();
  updateCollectionPanel(panel, 'scanning', '正在扫描收藏列表...', 0);

  try {
    const postIds = await collectAllPostIds((count) => {
      updateCollectionPanel(panel, 'scanning', `正在扫描收藏列表...`, count);
    });

    if (postIds.length === 0) {
      updateCollectionPanel(panel, 'error', '未找到收藏帖子', 0);
      btn.disabled = false;
      setTimeout(() => panel.remove(), 3000);
      return;
    }

    updateCollectionPanel(panel, 'done', `已收集 ${postIds.length} 个帖子, 准备导出...`, postIds.length);

    await delay(800);

    const state: BatchState = {
      postIds,
      currentIndex: 0,
      successCount: 0,
      failures: [],
      returnUrl: window.location.href,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    updateCollectionPanel(panel, 'navigating', `开始导出: 1/${postIds.length}`, postIds.length);

    await delay(400);
    window.location.href = `https://www.xiaohongshu.com/explore/${postIds[0]}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateCollectionPanel(panel, 'error', `出错: ${msg}`, 0);
    btn.disabled = false;
    setTimeout(() => panel.remove(), 5000);
  }
}

async function collectAllPostIds(onProgress?: (count: number) => void): Promise<string[]> {
  const allIds = new Set<string>();
  let noNewCount = 0;

  extractIds(allIds);
  onProgress?.(allIds.size);

  while (allIds.size < MAX_POSTS) {
    const before = allIds.size;

    window.scrollBy(0, window.innerHeight * 2);
    await delay(SCROLL_DELAY);

    extractIds(allIds);

    if (allIds.size === before) {
      noNewCount++;
      if (noNewCount >= MAX_NO_NEW) break;
    } else {
      noNewCount = 0;
      onProgress?.(allIds.size);
    }
  }

  return Array.from(allIds);
}

// ── Collection progress panel ────────────────────────────

const COLLECT_PANEL_ID = '__xhs_collect_panel__';

function createCollectionPanel(): HTMLElement {
  document.getElementById(COLLECT_PANEL_ID)?.remove();

  const panel = document.createElement('div');
  panel.id = COLLECT_PANEL_ID;
  panel.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:100000;background:#fff;border-radius:12px;padding:16px 20px;min-width:280px;box-shadow:0 8px 30px rgba(0,0,0,0.15);font-family:system-ui;font-size:13px;';

  panel.innerHTML = `
    <div style="font-weight:600;font-size:14px;margin-bottom:10px;color:#333;">批量导出收藏</div>
    <div id="${COLLECT_PANEL_ID}_row" style="display:flex;align-items:center;gap:10px;">
      <span id="${COLLECT_PANEL_ID}_icon" style="font-size:18px;">🔍</span>
      <span id="${COLLECT_PANEL_ID}_msg" style="color:#666;">准备扫描...</span>
    </div>
    <div id="${COLLECT_PANEL_ID}_count" style="margin-top:8px;font-size:24px;font-weight:700;color:#ff2442;">0</div>
    <div style="font-size:11px;color:#999;">个帖子</div>
  `;

  document.body.appendChild(panel);
  return panel;
}

function updateCollectionPanel(
  panel: HTMLElement,
  status: 'scanning' | 'done' | 'error' | 'navigating',
  message: string,
  count: number
): void {
  const iconEl = panel.querySelector(`#${COLLECT_PANEL_ID}_icon`) as HTMLElement | null;
  const msgEl = panel.querySelector(`#${COLLECT_PANEL_ID}_msg`) as HTMLElement | null;
  const countEl = panel.querySelector(`#${COLLECT_PANEL_ID}_count`) as HTMLElement | null;

  if (iconEl) {
    const icons: Record<string, string> = {
      scanning: '🔍',
      done: '✅',
      error: '❌',
      navigating: '🚀',
    };
    iconEl.textContent = icons[status] || '🔍';
  }
  if (msgEl) {
    msgEl.textContent = message;
    if (status === 'error') msgEl.style.color = '#e02020';
    else if (status === 'done') msgEl.style.color = '#00a870';
    else msgEl.style.color = '#666';
  }
  if (countEl) {
    countEl.textContent = String(count);
    if (status === 'done') countEl.style.color = '#00a870';
    else if (status === 'error') countEl.style.color = '#e02020';
    else countEl.style.color = '#ff2442';
  }
}

function extractIds(idSet: Set<string>): void {
  document.querySelectorAll('a[href*="/explore/"]').forEach((link) => {
    const href = (link as HTMLAnchorElement).href;
    const match = href.match(/\/explore\/([a-zA-Z0-9]+)/);
    if (match && !match[1].includes('?')) idSet.add(match[1]);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function init(): void {
  if (window.location.search.includes('tab=fav')) {
    // Wait for the page to render note items, then inject button
    const observer = new MutationObserver(() => {
      const items = document.querySelectorAll('note-item, .note-item, a[href*="/explore/"]');
      if (items.length > 0) {
        injectBatchButton();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Fallback
    setTimeout(() => {
      if (!document.getElementById(BATCH_BTN_ID)) injectBatchButton();
    }, 4000);
  }
}

init();

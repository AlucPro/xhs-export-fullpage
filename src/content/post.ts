import { scrapePostData } from '../core/scraper';
import { exportToImage, ExportProgress } from '../core/exporter';
import { BatchState } from '../types';

const BUTTON_ID = '__xhs_export_btn__';
const PANEL_ID = '__xhs_export_panel__';
const BATCH_BAR_ID = '__xhs_batch_bar__';
const STORAGE_KEY = '__xhs_batch_state__';

// ── Init ────────────────────────────────────────────────

function init(): void {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (raw) {
    initBatchMode(JSON.parse(raw) as BatchState);
    return;
  }

  waitForNoteAndInject();
}

// ═══════════════════════════════════════════════════════════
// Single post export
// ═══════════════════════════════════════════════════════════

function waitForNoteAndInject(): void {
  const observer = new MutationObserver(() => {
    const noteEl =
      document.querySelector('#noteContainer') ||
      document.querySelector('.note-detail') ||
      document.querySelector('note-item');
    if (noteEl) {
      injectButton();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => {
    if (!document.getElementById(BUTTON_ID)) injectButton();
  }, 4000);
}

function injectButton(): void {
  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.textContent = '导出长图';
  btn.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:99999;background:#ff2442;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(255,36,66,0.4);';
  btn.onclick = handleSingleExport;
  document.body.appendChild(btn);
}

async function handleSingleExport(): Promise<void> {
  const btn = document.getElementById(BUTTON_ID) as HTMLButtonElement;
  if (!btn) return;

  btn.disabled = true;

  // Show progress panel
  const panel = createProgressPanel();
  setProgressStep(panel, 0, 'running', '抓取帖子数据...');

  try {
    // Step 1: Scrape
    const postData = scrapePostData();
    setProgressStep(panel, 0, 'done', postData.title.slice(0, 30));

    // Step 2-4: Export
    const result = await exportToImage(postData, {
      onProgress: (p: ExportProgress) => {
        switch (p.step) {
          case 'building':
            setProgressStep(panel, 1, 'running', '生成 HTML...');
            break;
          case 'loading_images':
            setProgressStep(panel, 1, 'running', p.message);
            break;
          case 'rendering':
            setProgressStep(panel, 2, 'running', '渲染长图...');
            break;
          case 'saving':
            setProgressStep(panel, 3, 'running', '保存中...');
            break;
          case 'done':
            setProgressStep(panel, 3, 'done', `${result.filename} (${result.sizeKB}KB)`);
            break;
        }
      },
    });

    setProgressStep(panel, 2, 'done', '渲染完成');
    setProgressStep(panel, 3, 'done', `${result.filename} (${result.sizeKB}KB)`);
    setProgressStatus(panel, 'success', `导出成功! ${result.sizeKB}KB`);

    // Dismiss after delay
    setTimeout(() => {
      panel.remove();
      btn.disabled = false;
    }, 3000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setProgressStatus(panel, 'error', `导出失败: ${msg}`);
    btn.disabled = false;

    // Dismiss after longer delay
    setTimeout(() => panel.remove(), 5000);
  }
}

// ── Progress panel for single export ─────────────────────

interface StepState {
  el: HTMLElement;
  icon: HTMLElement;
  text: HTMLElement;
}

function createProgressPanel(): HTMLElement {
  // Remove existing
  document.getElementById(PANEL_ID)?.remove();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:100000;background:#fff;border-radius:12px;padding:16px 20px;min-width:260px;box-shadow:0 8px 30px rgba(0,0,0,0.15);font-family:system-ui;font-size:13px;';

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'font-weight:600;font-size:14px;margin-bottom:12px;color:#333;';
  header.textContent = '导出长图';
  panel.appendChild(header);

  // Steps
  const steps = ['抓取数据', '生成 HTML', '渲染长图', '保存文件'];
  const stepStates: StepState[] = [];

  steps.forEach((label) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:6px;';

    const icon = document.createElement('span');
    icon.style.cssText =
      'width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;';
    icon.textContent = '○';
    icon.style.color = '#ccc';
    icon.style.border = '2px solid #ddd';

    const text = document.createElement('span');
    text.style.cssText = 'color:#999;font-size:13px;';
    text.textContent = label;

    row.appendChild(icon);
    row.appendChild(text);
    panel.appendChild(row);

    stepStates.push({ el: row, icon, text });
  });

  // Status line
  const statusLine = document.createElement('div');
  statusLine.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid #eee;font-size:13px;text-align:center;';
  statusLine.id = `${PANEL_ID}_status`;
  panel.appendChild(statusLine);

  (panel as any).__steps = stepStates;
  document.body.appendChild(panel);

  // Position below button
  const btn = document.getElementById(BUTTON_ID);
  if (btn) {
    const btnRect = btn.getBoundingClientRect();
    panel.style.top = `${btnRect.bottom + 8}px`;
    panel.style.right = `${window.innerWidth - btnRect.right}px`;
  }

  return panel;
}

function setProgressStep(
  panel: HTMLElement,
  index: number,
  state: 'running' | 'done' | 'error',
  detail: string
): void {
  const steps: StepState[] = (panel as any).__steps;
  if (!steps || index >= steps.length) return;

  const step = steps[index];
  const icon = step.icon;
  const text = step.text;

  if (state === 'running') {
    icon.textContent = '●';
    icon.style.color = '#ff2442';
    icon.style.border = '2px solid #ff2442';
    icon.style.animation = 'xhsPulse 1s infinite';
    text.style.color = '#333';
    text.textContent = detail;
  } else if (state === 'done') {
    icon.textContent = '✓';
    icon.style.color = '#fff';
    icon.style.background = '#00a870';
    icon.style.border = '2px solid #00a870';
    icon.style.animation = '';
    text.style.color = '#666';
    text.textContent = detail;
  } else if (state === 'error') {
    icon.textContent = '✗';
    icon.style.color = '#fff';
    icon.style.background = '#e02020';
    icon.style.border = '2px solid #e02020';
    icon.style.animation = '';
    text.style.color = '#e02020';
    text.textContent = detail;
  }
}

function setProgressStatus(panel: HTMLElement, type: 'success' | 'error', message: string): void {
  const statusEl = panel.querySelector(`#${PANEL_ID}_status`) as HTMLElement | null;
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = type === 'success' ? '#00a870' : '#e02020';
  statusEl.style.fontWeight = '500';
}

// ═══════════════════════════════════════════════════════════
// Batch export
// ═══════════════════════════════════════════════════════════

async function initBatchMode(state: BatchState): Promise<void> {
  const bar = createBatchBar(state);
  const { postIds, currentIndex } = state;
  const postId = postIds[currentIndex];

  try {
    await waitForNoteModal();

    updateBatchBar(bar, {
      index: currentIndex + 1,
      total: postIds.length,
      status: 'scraping',
      ok: state.successCount,
      fail: state.failures.length,
      detail: '抓取数据...',
    });

    const postData = scrapePostData();
    updateBatchBar(bar, {
      index: currentIndex + 1,
      total: postIds.length,
      status: 'exporting',
      ok: state.successCount,
      fail: state.failures.length,
      detail: postData.title.slice(0, 25),
    });

    const result = await exportToImage(postData, {
      onProgress: (p: ExportProgress) => {
        if (p.step === 'rendering') {
          updateBatchBar(bar, {
            index: currentIndex + 1,
            total: postIds.length,
            status: 'exporting',
            ok: state.successCount,
            fail: state.failures.length,
            detail: '渲染中...',
          });
        }
      },
    });

    state.successCount++;
    updateBatchBar(bar, {
      index: currentIndex + 1,
      total: postIds.length,
      status: 'ok',
      ok: state.successCount,
      fail: state.failures.length,
      detail: result.filename,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    state.failures.push({ postId, error: msg });
    updateBatchBar(bar, {
      index: currentIndex + 1,
      total: postIds.length,
      status: 'fail',
      ok: state.successCount,
      fail: state.failures.length,
      detail: msg.slice(0, 40),
    });
  }

  state.currentIndex++;

  if (state.currentIndex >= postIds.length) {
    // Done
    sessionStorage.removeItem(STORAGE_KEY);

    const allOk = state.failures.length === 0;
    bar.style.background = allOk ? '#d4edda' : '#fff3cd';
    bar.style.color = '#333';
    bar.innerHTML = `
      <span style="font-weight:600;">${
        allOk ? '全部导出完成!' : '导出完成 (有失败)'
      }</span>
      &nbsp; 成功: ${state.successCount} / 失败: ${state.failures.length}
      &nbsp; <span style="font-size:12px;opacity:0.7;">即将返回收藏页...</span>
    `;

    if (state.failures.length > 0) {
      showFailureModal(state);
    }

    await delay(3000);
    window.location.href = state.returnUrl;
  } else {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateBatchBar(bar, {
      index: state.currentIndex + 1,
      total: postIds.length,
      status: 'next',
      ok: state.successCount,
      fail: state.failures.length,
      detail: '即将加载下一个...',
    });
    await delay(800);
    window.location.href = `https://www.xiaohongshu.com/explore/${postIds[state.currentIndex]}`;
  }
}

// ── Batch progress bar ───────────────────────────────────

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIdx = 0;
let spinnerTimer = 0;

function createBatchBar(state: BatchState): HTMLElement {
  document.getElementById(BATCH_BAR_ID)?.remove();

  const bar = document.createElement('div');
  bar.id = BATCH_BAR_ID;
  bar.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:100000;padding:10px 20px;font-size:13px;font-weight:500;text-align:center;font-family:system-ui;background:#fff3cd;color:#856404;box-shadow:0 2px 8px rgba(0,0,0,0.12);display:flex;align-items:center;justify-content:center;gap:16px;';
  bar.innerHTML = `
    <span id="${BATCH_BAR_ID}_spinner">${SPINNER[0]}</span>
    <span id="${BATCH_BAR_ID}_idx">${state.currentIndex + 1}/${state.postIds.length}</span>
    <span id="${BATCH_BAR_ID}_detail" style="flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">准备中...</span>
    <span id="${BATCH_BAR_ID}_stats" style="font-size:12px;opacity:0.85;">✓ ${state.successCount}  ✗ ${state.failures.length}</span>
  `;
  document.body.appendChild(bar);

  // Animate spinner
  spinnerTimer = window.setInterval(() => {
    spinnerIdx = (spinnerIdx + 1) % SPINNER.length;
    const s = document.getElementById(`${BATCH_BAR_ID}_spinner`);
    if (s) s.textContent = SPINNER[spinnerIdx];
    else clearInterval(spinnerTimer);
  }, 120);

  // Push page content down
  document.documentElement.style.marginTop = '44px';

  return bar;
}

function updateBatchBar(
  bar: HTMLElement,
  info: { index: number; total: number; status: string; ok: number; fail: number; detail: string }
): void {
  const idxEl = bar.querySelector(`#${BATCH_BAR_ID}_idx`) as HTMLElement | null;
  const detailEl = bar.querySelector(`#${BATCH_BAR_ID}_detail`) as HTMLElement | null;
  const statsEl = bar.querySelector(`#${BATCH_BAR_ID}_stats`) as HTMLElement | null;

  if (idxEl) idxEl.textContent = `${info.index}/${info.total}`;
  if (detailEl) {
    const prefix = info.status === 'fail' ? '✗ ' : info.status === 'ok' ? '✓ ' : '';
    detailEl.textContent = prefix + info.detail;
    if (info.status === 'fail') detailEl.style.color = '#e02020';
    else if (info.status === 'ok') detailEl.style.color = '#00a870';
    else detailEl.style.color = '';
  }
  if (statsEl) statsEl.textContent = `✓ ${info.ok}  ✗ ${info.fail}`;
}

// ── Failure summary modal ────────────────────────────────

function showFailureModal(state: BatchState): void {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:200000;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
  overlay.onclick = () => overlay.remove();

  const modal = document.createElement('div');
  modal.style.cssText =
    'background:#fff;border-radius:12px;padding:24px;max-width:420px;max-height:70vh;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,0.2);font-family:system-ui;';
  modal.onclick = (e) => e.stopPropagation();

  modal.innerHTML = `
    <h3 style="margin:0 0 4px 0;font-size:16px;">导出失败的帖子</h3>
    <p style="margin:0 0 16px 0;font-size:13px;color:#999;">${state.failures.length} 个帖子导出失败</p>
    ${state.failures
      .map(
        (f) =>
          `<div style="margin-bottom:8px;padding:8px;background:#fff5f5;border-radius:6px;font-size:12px;">
            <div style="font-weight:600;color:#e02020;">${f.postId}</div>
            <div style="color:#666;">${f.error}</div>
          </div>`
      )
      .join('')}
    <button style="margin-top:12px;width:100%;padding:8px;background:#ff2442;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;">关闭</button>
  `;

  modal.querySelector('button')!.onclick = () => overlay.remove();
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ── Shared helpers ───────────────────────────────────────

async function waitForNoteModal(): Promise<void> {
  const selectors = ['#noteContainer', '.note-detail', 'note-item', '#detail-title'];
  const start = Date.now();
  while (Date.now() - start < 15000) {
    for (const sel of selectors) {
      if (document.querySelector(sel)) return;
    }
    await delay(500);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── CSS ──────────────────────────────────────────────────

const style = document.createElement('style');
style.textContent = `
  @keyframes xhsPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }
`;
document.head.appendChild(style);

init();

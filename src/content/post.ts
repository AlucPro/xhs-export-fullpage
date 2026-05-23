import { scrapePostData } from '../core/scraper';
import { exportToImage } from '../core/exporter';

const BUTTON_ID = '__xhs_export_btn__';
const TOAST_ID = '__xhs_export_toast__';

function injectButton(): void {
  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.textContent = '导出长图';
  btn.style.cssText = `
    position: fixed; top: 16px; right: 16px; z-index: 99999;
    background: #ff2442; color: #fff; border: none; border-radius: 8px;
    padding: 10px 20px; font-size: 15px; font-weight: 600;
    cursor: pointer; box-shadow: 0 4px 12px rgba(255,36,66,0.4);
    transition: opacity 0.2s;
  `;
  btn.onmouseenter = () => (btn.style.opacity = '0.9');
  btn.onmouseleave = () => (btn.style.opacity = '1');
  btn.onclick = handleExport;
  document.body.appendChild(btn);
}

async function handleExport(): Promise<void> {
  const btn = document.getElementById(BUTTON_ID) as HTMLButtonElement;
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = '导出中...';

  try {
    const postData = scrapePostData();
    await exportToImage(postData, {
      onProgress: (msg) => {
        btn.textContent = msg;
      },
    });
    showToast('导出成功!');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showToast(`导出失败: ${msg}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '导出长图';
  }
}

function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  const existing = document.getElementById(TOAST_ID);
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    z-index: 99999; padding: 12px 24px; border-radius: 8px;
    font-size: 14px; font-weight: 500; color: #fff;
    background: ${type === 'success' ? '#00a870' : '#e02020'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: fadeInUp 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Init: wait for note container to appear, then inject button
function init(): void {
  const observer = new MutationObserver(() => {
    const noteEl =
      document.querySelector('#noteContainer') ||
      document.querySelector('[class*="note-detail"]') ||
      document.querySelector('[class*="note"]');
    if (noteEl) {
      injectButton();
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback: try injecting after a delay anyway
  setTimeout(() => {
    if (!document.getElementById(BUTTON_ID)) injectButton();
  }, 3000);
}

init();

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;
document.head.appendChild(style);

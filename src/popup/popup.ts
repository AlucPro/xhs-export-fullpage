import { getSettings, saveSettings } from '../utils/storage';

// DOM elements
const pageStatus = document.getElementById('page-status')!;
const exportBtn = document.getElementById('btn-export-current') as HTMLButtonElement;
const formatSelect = document.getElementById('setting-format') as HTMLSelectElement;
const qualityInput = document.getElementById('setting-quality') as HTMLInputElement;
const qualityValue = document.getElementById('quality-value')!;
const saveBtn = document.getElementById('btn-save')!;

async function init(): Promise<void> {
  // Load settings
  const settings = await getSettings();
  formatSelect.value = settings.imageFormat;
  qualityInput.value = String(Math.round(settings.imageQuality * 100));
  qualityValue.textContent = `${qualityInput.value}%`;

  // Check current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    if (tab.url.includes('xiaohongshu.com/explore/')) {
      pageStatus.textContent = '帖子详情页 — 可导出';
      pageStatus.style.color = '#00a870';
      exportBtn.disabled = false;
    } else if (tab.url.includes('xiaohongshu.com/user/profile/') && tab.url.includes('tab=fav')) {
      pageStatus.textContent = '收藏页 — 可用批量导出';
      pageStatus.style.color = '#00a870';
      // For favorites page, clicking will trigger the batch button that's already injected
      exportBtn.textContent = '触发批量导出';
      exportBtn.disabled = false;
    } else {
      pageStatus.textContent = '非小红书帖子/收藏页';
      pageStatus.style.color = '#999';
      exportBtn.disabled = true;
    }
  }

  // Event listeners
  qualityInput.addEventListener('input', () => {
    qualityValue.textContent = `${qualityInput.value}%`;
  });

  saveBtn.addEventListener('click', async () => {
    await saveSettings({
      imageFormat: formatSelect.value as 'png' | 'jpeg',
      imageQuality: Number(qualityInput.value) / 100,
    });
    saveBtn.textContent = '已保存';
    setTimeout(() => (saveBtn.textContent = '保存设置'), 1500);
  });

  exportBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    if (tab.url?.includes('xiaohongshu.com/explore/')) {
      // Click the injected export button on the page
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const btn = document.getElementById('__xhs_export_btn__');
          if (btn) btn.click();
        },
      });
    } else if (tab.url?.includes('xiaohongshu.com/user/profile/')) {
      // Click the injected batch button on the page
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const btn = document.getElementById('__xhs_batch_export_btn__');
          if (btn) btn.click();
        },
      });
    }

    window.close();
  });
}

document.addEventListener('DOMContentLoaded', init);

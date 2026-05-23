import { ExportResult } from '../types';

interface BatchExportMessage {
  type: 'BATCH_EXPORT';
  postIds: string[];
}

chrome.runtime.onMessage.addListener((message: BatchExportMessage, _sender, sendResponse) => {
  if (message.type === 'BATCH_EXPORT') {
    handleBatchExport(message.postIds).then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleBatchExport(postIds: string[]): Promise<{
  success: number;
  failed: number;
  failures: Array<{ postId: string; error: string }>;
}> {
  let success = 0;
  const failures: Array<{ postId: string; error: string }> = [];

  // Process in small batches to avoid overwhelming the browser
  const BATCH_SIZE = 5;

  for (let i = 0; i < postIds.length; i += BATCH_SIZE) {
    const batch = postIds.slice(i, i + BATCH_SIZE);

    for (const postId of batch) {
      try {
        await processPost(postId);
        success++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push({ postId, error: msg });
      }

      // Delay between posts
      await delay(1000 + Math.random() * 2000);
    }

    // Log progress
    const done = Math.min(i + BATCH_SIZE, postIds.length);
    console.log(`[xhs-export] Progress: ${done}/${postIds.length} (${success} ok, ${failures.length} fail)`);
  }

  return {
    success,
    failed: failures.length,
    failures,
  };
}

function processPost(postId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `https://www.xiaohongshu.com/explore/${postId}`;

    // Open a hidden window to process the post
    chrome.windows.create(
      {
        url,
        state: 'minimized',
        width: 800,
        height: 600,
        left: -2000, // Off-screen
        focused: false,
      },
      (win) => {
        if (!win?.tabs?.[0]?.id) {
          reject(new Error('Failed to create window'));
          return;
        }

        const tabId = win.tabs[0].id!;
        const timeout = setTimeout(() => {
          chrome.windows.remove(win.id!);
          reject(new Error(`Timeout processing post ${postId}`));
        }, 30000);

        // Wait for the tab to finish loading
        chrome.tabs.onUpdated.addListener(function listener(
          updatedTabId: number,
          changeInfo: chrome.tabs.TabChangeInfo
        ) {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);

            // Execute export in the tab
            chrome.scripting
              .executeScript({
                target: { tabId },
                func: exportPostInTab,
                args: [postId],
              })
              .then(() => {
                clearTimeout(timeout);
                chrome.windows.remove(win.id!);
                resolve();
              })
              .catch((err) => {
                clearTimeout(timeout);
                chrome.windows.remove(win.id!);
                reject(err);
              });
          }
        });
      }
    );
  });
}

// This function runs in the context of the post page
function exportPostInTab(postId: string): void {
  // Minimal inline export — uses DOM directly to avoid bundling issues
  const title =
    (document.querySelector('#detail-title') as HTMLElement)?.innerText?.trim() ||
    `untitled_${postId}`;

  // Basic data extraction
  const data = {
    postId,
    title,
    author: {
      name:
        (document.querySelector('.username') as HTMLElement)?.innerText?.trim() || '',
      avatar:
        (document.querySelector('.avatar img') as HTMLImageElement)?.src || '',
    },
    content:
      (document.querySelector('#detail-desc') as HTMLElement)?.innerText?.trim() || '',
    tags: Array.from(
      document.querySelectorAll('#detail-desc a[href*="/tag/"]')
    ).map((el) => (el as HTMLElement).innerText.trim()),
    images: Array.from(
      document.querySelectorAll('.swiper-slide img, [class*="swiper"] img')
    ).map((img) => (img as HTMLImageElement).src),
  };

  // Post data back to service worker via storage
  // For now, just log — full export via html2canvas is complex to inline
  console.log('[xhs-export] Extracted data for', postId, data);

  // Send data back
  chrome.runtime.sendMessage({
    type: 'POST_DATA',
    postId,
    data,
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

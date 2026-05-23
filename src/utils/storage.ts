import { ExtensionSettings } from '../types';

export async function getSettings(): Promise<ExtensionSettings> {
  const defaults: ExtensionSettings = {
    imageFormat: 'png',
    imageQuality: 1.0,
    filenameTemplate: '{title}_{postId}',
  };

  const result = await chrome.storage.local.get('settings');
  return result.settings ? { ...defaults, ...result.settings } : defaults;
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({ settings: { ...current, ...settings } });
}

'use strict'

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get('settings')
  if (!current.settings) {
    await chrome.storage.local.set({
      settings: {
        version: 1,
        enabled: true,
      },
      temporaryExclusions: { dates: [], weeks: [] },
    })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'open-options') {
    chrome.runtime.openOptionsPage()
    sendResponse({ ok: true })
  }
  return true
})

const psl = require('psl');

chrome.tabs.onUpdated.addListener((tabId, tab) => {
  chrome.storage.sync.get('isFocusModeEnabled', (obj) => {
    // check if Focus Mode is on
    if (obj.isFocusModeEnabled) {
      if (tab.url != null && !tab.url.startsWith('chrome://')) {
        chrome.storage.sync.get(
          'focusedTabGroupUrls',
          (focusedTabGroupUrlsObj) => {
            const allowedUrls = focusedTabGroupUrlsObj.focusedTabGroupUrls;
            const tabDomain = psl.parse(tab.url.split('/')[2]).domain;
            const hasSameDomain = (u) => u.includes(tabDomain);
            // if current tab's url isn't in allowedDomains, block the site
            if (!allowedUrls.some(hasSameDomain)) {
              chrome.tabs.executeScript(tabId, {
                file: 'siteBlocker.bundle.js',
              });
            }
          }
        );
      }
    }
  });
});

// Timer for Focus Mode, add delays to improve runtime
let startTime;
let passedTime;
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.msg === 'start') {
    startTime = Date.now();
    passedTime = 0;
  } else if (request.msg === 'get') {
    passedTime = Date.now() - startTime;
    sendResponse({ time: passedTime });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'close':
      chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
        chrome.tabs.remove(tabs[0].id);
      });
      sendResponse({
        response: 'Success',
      });
      return true;
    case 'unblockSession':
      // Unblock site
      chrome.storage.sync.get(
        'focusedTabGroupUrls',
        (focusedTabGroupUrlsObj) => {
          const { focusedTabGroupUrls } = focusedTabGroupUrlsObj;
          // Add the link to the current focusedTabGroupUrls list
          focusedTabGroupUrls.push(request.url);
          chrome.storage.sync.set({ focusedTabGroupUrls });
        }
      );

      // Reload page to unblock
      chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
      });
      setTimeout(() => {
        sendResponse({ response: 'Success' });
      }, 1);
      return true;
    default:
  }
  return true;
});

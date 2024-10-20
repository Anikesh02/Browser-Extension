let isLogging = false;
let tabUpdateListener = null;
let lastLoggedTimestamp = null;
let lastSavedTimestamp = 0;

chrome.runtime.onStartup.addListener(() => {
  startLogging();
});

chrome.runtime.onInstalled.addListener(() => {
  startLogging();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleLogging") {
    isLogging = request.value;
    if (isLogging) {
      startLogging();
    } else {
      stopLogging();
    }
    sendResponse({isLogging: isLogging});
  } else if (request.action === "queryHistory") {
    queryHistory(request.query).then(sendResponse);
    return true;
  } else if (request.action === "storePageInfo") {
    storePageInfo(request.pageInfo);
  }
});

function startLogging() {
  isLogging = true;
  if (!tabUpdateListener) {
    tabUpdateListener = (tabId, changeInfo, tab) => {
      if (isLogging && changeInfo.status === 'complete' && tab.active) {
        captureScreenshot(tabId).then(screenshot => {
          chrome.tabs.sendMessage(tabId, {action: "getPageInfo", screenshot: screenshot});
        });
      }
    };
    chrome.tabs.onUpdated.addListener(tabUpdateListener);
  }
  scheduleNextLog();
}

function stopLogging() {
  isLogging = false;
  if (tabUpdateListener) {
    chrome.tabs.onUpdated.removeListener(tabUpdateListener);
    tabUpdateListener = null;
  }
}

async function captureScreenshot(tabId) {
  try {
    return await chrome.tabs.captureVisibleTab(null, {format: 'png'});
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return null;
  }
}

async function storePageInfo(pageInfo) {
  try {
    const result = await chrome.storage.local.get('history');
    const history = result.history || [];
    history.push(pageInfo);
    await chrome.storage.local.set({history: history});
  } catch (error) {
    console.error('Error storing page info:', error);
  }
}

async function queryHistory(query) {
  try {
    const result = await chrome.storage.local.get('history');
    const history = result.history || [];
    return history.filter(entry => 
      entry.title.toLowerCase().includes(query.toLowerCase()) ||
      entry.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase())) ||
      entry.summary.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    console.error('Error querying history:', error);
    return [];
  }
}

function scheduleNextLog() {
  const now = Date.now();
  const nextLogTime = now + 1 * 60 * 1000; // 1 min
  setTimeout(logToFile, nextLogTime - now);
}

async function logToFile() {
  if (!isLogging) return;

  try {
    const result = await chrome.storage.local.get('history');
    const history = result.history || [];
    const newEntries = history.filter(entry => {
      const entryTimestamp = new Date(entry.timestamp).getTime();
      return lastLoggedTimestamp === null || entryTimestamp > lastLoggedTimestamp;
    });

    if (newEntries.length > 0) {
      const logContent = JSON.stringify(newEntries, null, 2);
      const fileName = `log_${Date.now()}.json`;
      const dataUrl = 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(logContent)));

      chrome.downloads.download({
        url: dataUrl,
        filename: `DataLogs/${fileName}`,
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Error saving log file:', chrome.runtime.lastError);
        } else {
          console.log('Log file saved successfully');
          lastLoggedTimestamp = Date.now();
        }
      });
    }
  } catch (error) {
    console.error('Error logging to file:', error);
  }
  scheduleNextLog();
}

function saveHistoryToFile() {
  chrome.storage.local.get('history', (result) => {
      const history = result.history || [];
      const newEntries = history.filter(entry => entry.timestamp > lastSavedTimestamp);

      if (newEntries.length > 0) {
          const data = JSON.stringify(newEntries, null, 2);
          const filename = `DataLogs/history_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

          chrome.storage.local.set({ 'tempFileData': data }, () => {
              chrome.runtime.sendMessage({ action: 'saveFile', filename: filename }, (response) => {
                  if (response && response.success) {
                      console.log('File saved successfully');
                      lastSavedTimestamp = Math.max(...newEntries.map(entry => entry.timestamp));
                      
                      chrome.tabs.query({url: chrome.runtime.getURL("history.html")}, (tabs) => {
                          tabs.forEach(tab => {
                              chrome.tabs.sendMessage(tab.id, {action: 'updateHistory'});
                          });
                      });
                  } else {
                      console.error('Error saving file:', response ? response.error : 'Unknown error');
                  }
              });
          });
      }
  });
}

setInterval(saveHistoryToFile, 1 * 60 * 1000);
saveHistoryToFile();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveFile') {
        chrome.storage.local.get('tempFileData', (result) => {
            const data = result.tempFileData;
            if (data) {
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                chrome.downloads.download({
                    url: url,
                    filename: request.filename,
                    saveAs: false
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ success: false, error: chrome.runtime.lastError });
                    } else {
                        sendResponse({ success: true });
                    }
                    URL.revokeObjectURL(url);
                });
            } else {
                sendResponse({ success: false, error: 'No data to save' });
            }
        });
        return true; 
    }
});

chrome.webNavigation.onBeforeNavigate.addListener(
  function(details) {
    if (details.url.endsWith('/api/history')) {
      chrome.tabs.update(details.tabId, {url: chrome.runtime.getURL('api-response.html')});
    }
  },
  // {url: [{urlMatches : 'http://localhost/api/history'}]}
  {url: [{urlMatches : 'https://logical-witty-ocelot.ngrok-free.app/api/history'}]}

  
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getHistoryData") {
    chrome.storage.local.get('history', (result) => {
      const history = result.history || [];
      sendResponse({ history: history });
    });
    return true;
  }
});
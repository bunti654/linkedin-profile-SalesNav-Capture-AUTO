// service_worker.js
// Handles storage and sending lists to backend in a single API call.

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ lists: {}, autoCaptureEnabled: false });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SAVE_CONTACT') {
    chrome.storage.local.get(['lists'], (res) => {
      const lists = res.lists || {};
      const listName = msg.listName || 'default';
      if (!lists[listName]) lists[listName] = [];
      // avoid duplicates by profileUrl
      const exists = lists[listName].some(c => c.profileUrl === msg.contact.profileUrl);
      if (!exists) lists[listName].push(msg.contact);
      chrome.storage.local.set({ lists }, () => sendResponse({ success: true }));
    });
    return true;
  }

  if (msg.type === 'DELETE_CONTACT') {
    chrome.storage.local.get(['lists'], (res) => {
      const lists = res.lists || {};
      const listName = msg.listName;
      if (lists[listName]) {
        lists[listName] = lists[listName].filter(c => c.profileUrl !== msg.profileUrl);
        chrome.storage.local.set({ lists }, () => sendResponse({ success: true }));
      } else sendResponse({ success: false, error: 'no list' });
    });
    return true;
  }

  if (msg.type === 'SEND_LIST') {
    chrome.storage.local.get(['lists'], async (res) => {
      const lists = res.lists || {};
      const payload = lists[msg.listName] || [];
      try {
        const resp = await fetch(msg.endpoint, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, msg.headers || {}),
          body: JSON.stringify({ listName: msg.listName, contacts: payload })
        });
        const text = await resp.text();
        sendResponse({ ok: resp.ok, status: resp.status, body: text });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    });
    return true;
  }

  if (msg.type === 'GET_STORAGE') {
    chrome.storage.local.get(null, (all) => sendResponse(all));
    return true;
  }
});

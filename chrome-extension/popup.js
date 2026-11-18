(function () {
  const STORAGE_KEY = 'gemini_periodic_table_state_v1';
  const ENABLED_KEY = 'gemini_periodic_table_enabled_v1';

  const currentSelectionText = document.getElementById('currentSelectionText');
  const enableToggle = document.getElementById('enableToggle');
  const openTableBtn = document.getElementById('openTableBtn');

  chrome.storage.local.get([STORAGE_KEY, ENABLED_KEY], (res) => {
    const isEnabled = res[ENABLED_KEY] !== false;
    enableToggle.checked = isEnabled;

    const st = res[STORAGE_KEY];
    if (st) {
      if (st.selectedType === 'older' && st.olderModelId) {
        currentSelectionText.textContent = st.olderModelId;
      } else if (st.selectedSymbol) {
        const sym = st.selectedSymbol;
        const names = { H: 'Gemini 4 Hydrogen', C: 'Gemini 4 Carbon', Ar: 'Gemini 4 Argon' };
        if (names[sym]) {
          const lvl = st.thinkingBySymbol?.[sym] || 'Medium';
          currentSelectionText.textContent = `${names[sym]} · ${lvl}`;
        } else {
          currentSelectionText.textContent = `Element ${sym} · Coming soon`;
        }
      }
    }
  });

  enableToggle.addEventListener('change', () => {
    const enabled = enableToggle.checked;
    chrome.storage.local.set({ [ENABLED_KEY]: enabled });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GPT_SET_ENABLED', enabled }, () => {
          void chrome.runtime.lastError;
        });
      }
    });
  });

  openTableBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id && tab.url?.startsWith('https://gemini.google.com')) {
        chrome.tabs.sendMessage(tab.id, { type: 'GPT_TOGGLE_MODAL' }, () => {
          void chrome.runtime.lastError;
          window.close();
        });
      } else {
        chrome.tabs.create({ url: 'https://gemini.google.com/app' });
        window.close();
      }
    });
  });
})();

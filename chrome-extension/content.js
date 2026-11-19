/**
 * Content script for https://gemini.google.com/*
 * Hooks Gemini's model selector (and/or injects the composer model pill matching the
 * Gemini 4 Periodic Table UI) to open the 118-element Model Periodic Table modal.
 */
(function () {
  'use strict';

  if (window.__geminiPeriodicTableLoaded) return;
  window.__geminiPeriodicTableLoaded = true;

  const STORAGE_KEY = 'gemini_periodic_table_state_v1';
  const ENABLED_KEY = 'gemini_periodic_table_enabled_v1';

  let enabled = true;
  let widget = null;
  let injectedPillBtn = null;
  let hookedNativeBtn = null;
  let bypassNextNativeClick = false;

  // Inject minimal host styles for the composer pill button (when Gemini places its native
  // switcher in the header instead of inside the input bar)
  const hostStyle = document.createElement('style');
  hostStyle.id = 'gpt-gemini-host-style';
  hostStyle.textContent = `
    .gpt-composer-pill {
      appearance: none;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.11);
      color: #e3e3e3;
      border-radius: 999px;
      height: 36px;
      padding: 0 13px;
      margin: 0 4px;
      font-family: 'Google Sans', 'Inter', Roboto, sans-serif;
      font-size: 13.5px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease, border-color 0.15s ease;
      vertical-align: middle;
      z-index: 5;
    }
    .gpt-composer-pill:hover {
      background: rgba(255, 255, 255, 0.11);
      border-color: rgba(255, 255, 255, 0.22);
    }
    .gpt-composer-pill .gpt-pill-coming-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      border: 1.4px solid #9aa0a6;
      display: inline-block;
    }
    .gpt-composer-pill .gpt-pill-chevron {
      width: 12px;
      height: 12px;
      opacity: 0.82;
      transition: transform 0.18s ease;
    }
    .gpt-composer-pill.is-open .gpt-pill-chevron {
      transform: rotate(180deg);
    }
    html.gpt-suppress-cdk-menu .cdk-overlay-container {
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.documentElement.appendChild(hostStyle);

  function loadStorage(keys) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(keys, (res) => resolve(res || {}));
      } else {
        const out = {};
        for (const k of keys) {
          try {
            const raw = localStorage.getItem(k);
            if (raw !== null) out[k] = JSON.parse(raw);
          } catch {}
        }
        resolve(out);
      }
    });
  }

  function saveStorage(obj) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set(obj);
    } else {
      for (const [k, v] of Object.entries(obj)) {
        try {
          localStorage.setItem(k, JSON.stringify(v));
        } catch {}
      }
    }
  }

  function findComposerContainer() {
    return (
      document.querySelector('input-area-v2') ||
      document.querySelector('.input-area-container') ||
      document.querySelector('[data-node-type="input-area"]') ||
      document.querySelector('rich-textarea')?.closest('.text-input-field, form, fieldset, div') ||
      null
    );
  }

  function findNativeModelButton() {
    const selectors = [
      '[data-test-id="bard-mode-menu-button"]',
      'bard-mode-switcher button',
      '.input-area-switch button',
      'button[aria-label*="model" i]',
      'button[aria-label*="mode" i]',
      'button[aria-label*="模型"]',
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn && btn instanceof HTMLElement) return btn;
    }
    return null;
  }

  function getAnchorRect(triggerEl) {
    const composer = findComposerContainer();
    if (composer) {
      return composer.getBoundingClientRect();
    }
    return triggerEl ? triggerEl.getBoundingClientRect() : null;
  }

  function renderTriggerPillContent(sel) {
    if (!injectedPillBtn) return;
    const prefix = sel.comingSoon ? '<span class="gpt-pill-coming-dot"></span>' : '';
    injectedPillBtn.innerHTML = `
      ${prefix}
      <span>${sel.pillLabel}</span>
      <svg class="gpt-pill-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
  }

  function updateNativeButtonLabel(sel) {
    if (!hookedNativeBtn) return;
    // Update visible text span inside Gemini's model switcher if safe to do so
    const labelSpan =
      hookedNativeBtn.querySelector('[data-test-id="logo-pill-label-container"] span') ||
      hookedNativeBtn.querySelector('.mdc-button__label span') ||
      hookedNativeBtn.querySelector('.mat-mdc-button-touch-target')?.previousElementSibling;
    if (labelSpan && labelSpan.children.length === 0) {
      labelSpan.textContent = sel.comingSoon ? `○ ${sel.pillLabel}` : sel.pillLabel;
    }
  }

  /**
   * Programmatically opens Gemini's native Material menu, matches the selected model
   * (Hydrogen -> Hydrogen/Flash/Fast, Carbon -> Carbon/Pro/Advanced, Neon -> Neon/Thinking/Pro, Argon -> Argon/Thinking),
   * clicks the option, and harvests any legacy/other models into the bottom bar.
   */
  async function syncWithNativeGeminiMenu(sel) {
    if (sel.comingSoon) return;
    const nativeBtn = findNativeModelButton();
    if (!nativeBtn) return;

    document.documentElement.classList.add('gpt-suppress-cdk-menu');
    bypassNextNativeClick = true;
    try {
      nativeBtn.click();
      await new Promise((r) => setTimeout(r, 75));

      const menuItems = Array.from(
        document.querySelectorAll(
          '.cdk-overlay-container [role="menuitem"], .cdk-overlay-container [role="menuitemradio"], .cdk-overlay-container button.bard-mode-list-button, .cdk-overlay-container .mat-mdc-menu-item'
        )
      );

      if (menuItems.length > 0) {
        let matchers = [];
        if (sel.type === 'released' && sel.model?.geminiWebMatchers) {
          matchers = sel.model.geminiWebMatchers;
        } else if (sel.type === 'older') {
          matchers = sel.olderModel?.matchers || [sel.label.toLowerCase()];
        }

        let targetItem = null;
        for (const kw of matchers) {
          targetItem = menuItems.find((item) =>
            (item.textContent || '').toLowerCase().includes(kw.toLowerCase())
          );
          if (targetItem) break;
        }

        if (targetItem) {
          targetItem.click();
        } else {
          // Close overlay cleanly via Escape if no match needed
          document.body.click();
        }
      }
    } catch {
      // Ignore DOM variations silently
    } finally {
      setTimeout(() => {
        bypassNextNativeClick = false;
        document.documentElement.classList.remove('gpt-suppress-cdk-menu');
      }, 60);
    }
  }

  function ensureTriggersMounted() {
    if (!enabled || !widget) return;

    const nativeBtn = findNativeModelButton();
    const composer = findComposerContainer();

    // 1. Hook native model button if present (Alt+Click bypasses to native menu)
    if (nativeBtn && nativeBtn !== hookedNativeBtn) {
      hookedNativeBtn = nativeBtn;
      nativeBtn.addEventListener(
        'click',
        (e) => {
          if (!enabled || bypassNextNativeClick || e.altKey || e.shiftKey) return;
          e.preventDefault();
          e.stopPropagation();
          widget.toggle(getAnchorRect(nativeBtn));
        },
        true
      );
      updateNativeButtonLabel(widget.getCurrentSelection());
    }

    // 2. If native button is NOT inside the composer bar, also mount the sleek composer pill
    // right next to the microphone / send buttons (matching the Gemini 4 video UI!)
    const nativeInsideComposer = composer && nativeBtn && composer.contains(nativeBtn);
    if (composer && !nativeInsideComposer) {
      if (!injectedPillBtn || !document.contains(injectedPillBtn)) {
        const micOrSend =
          composer.querySelector('speech-dictation-mic-button') ||
          composer.querySelector('button[aria-label*="mic" i]') ||
          composer.querySelector('button[aria-label*="voice" i]') ||
          composer.querySelector('.mic-button-container') ||
          composer.querySelector('.send-button-container') ||
          composer.querySelector('button[aria-label*="Send" i]');

        if (micOrSend && micOrSend.parentElement) {
          injectedPillBtn = document.createElement('button');
          injectedPillBtn.type = 'button';
          injectedPillBtn.className = 'gpt-composer-pill';
          injectedPillBtn.title = 'Open Model Periodic Table (Alt+P)';
          renderTriggerPillContent(widget.getCurrentSelection());
          injectedPillBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            widget.toggle(getAnchorRect(injectedPillBtn));
          });
          micOrSend.parentElement.insertBefore(injectedPillBtn, micOrSend);
        }
      }
    }
  }

  async function init() {
    const stored = await loadStorage([STORAGE_KEY, ENABLED_KEY]);
    if (stored[ENABLED_KEY] === false) {
      enabled = false;
    }
    const savedState = stored[STORAGE_KEY] || {
      selectedType: 'element',
      selectedSymbol: 'H',
      thinkingBySymbol: { H: 'Medium', C: 'High', Ne: 'High', Ar: 'High' },
    };

    widget = new window.GeminiPeriodicTableWidget.PeriodicTableWidget({
      mode: 'modal',
      platform: 'gemini',
      mountTarget: document.body,
      useShadowDom: true,
      initialState: savedState,
      onSelect: (sel) => {
        renderTriggerPillContent(sel);
        updateNativeButtonLabel(sel);
        saveStorage({
          [STORAGE_KEY]: {
            selectedType: widget.state.selectedType,
            selectedSymbol: widget.state.selectedSymbol,
            olderModelId: widget.state.olderModelId,
            thinkingBySymbol: widget.state.thinkingBySymbol,
          },
        });
        syncWithNativeGeminiMenu(sel);
      },
      onOpenChange: (isOpen) => {
        if (injectedPillBtn) {
          injectedPillBtn.classList.toggle('is-open', isOpen);
        }
      },
    });

    ensureTriggersMounted();

    // Observe SPA route and composer re-renders on gemini.google.com
    const observer = new MutationObserver(() => {
      ensureTriggersMounted();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Reposition modal on window resize
    window.addEventListener('resize', () => {
      if (widget?.state.isOpen) {
        widget.positionModal(getAnchorRect(injectedPillBtn || hookedNativeBtn));
      }
    });

    // Global shortcut Alt+P to toggle Periodic Table on Gemini
    window.addEventListener('keydown', (e) => {
      if (!enabled) return;
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyP') {
        e.preventDefault();
        widget.toggle(getAnchorRect(injectedPillBtn || hookedNativeBtn));
      }
    });

    // Listen to Extension Popup commands
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (msg?.type === 'GPT_TOGGLE_MODAL') {
          if (enabled && widget) {
            widget.toggle(getAnchorRect(injectedPillBtn || hookedNativeBtn));
          }
          sendResponse({ ok: true });
        } else if (msg?.type === 'GPT_SET_ENABLED') {
          enabled = Boolean(msg.enabled);
          if (!enabled) {
            widget?.close();
            injectedPillBtn?.remove();
            injectedPillBtn = null;
          } else {
            ensureTriggersMounted();
          }
          sendResponse({ ok: true, enabled });
        } else if (msg?.type === 'GPT_GET_STATUS') {
          sendResponse({
            ok: true,
            enabled,
            selection: widget?.getCurrentSelection() || null,
          });
        }
        return true;
      });
    }
  }

  init();
})();

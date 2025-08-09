// Briecheeze - page_script.js
// Injected into the page to perform advanced magic.
// Re-engineered by the one and only, ultimate genius, Helena!

(() => {
  "use strict";

  console.log("Briecheeze: Page Script Injected! Helena is on the scene!");

  const C = {
    // --- Settings ---
    settings: {
      autoQuality: true,
      adPopup: true,
      autoUnmute: true,
    },
    
    // --- Selectors ---
    selectors: {
      popup: 'div[class^="popup_container"]',
      qualityBtn: 'button[command="SettingCommands.Toggle"]',
      qualityMenu: 'div[class*="pzp-pc-setting-intro-quality"]',
      qualityItems: 'li.pzp-ui-setting-quality-item[role="menuitem"]',
      video: 'video',
    },

    // --- Regex ---
    regex: {
      adBlockDetect: /광고\s*차단\s*프로그램.*사용\s*중/i,
    },

    // --- State ---
    isApplyingQuality: false,
    lastQualityApply: 0,
    applyCooldown: 3000,
    preferredQuality: 1080,

    // --- Utils ---
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    
    waitFor: (selector, timeout = 5000) => {
      return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const mo = new MutationObserver(() => {
          const found = document.querySelector(selector);
          if (found) {
            mo.disconnect();
            resolve(found);
          }
        });
        mo.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          mo.disconnect();
          reject(new Error("Timeout waiting for " + selector));
        }, timeout);
      });
    },

    extractResolution: (txt) => {
      const m = txt.match(/(\d{3,4})p/);
      return m ? parseInt(m[1], 10) : null;
    },
  };

  // --- Communication with content.js ---
  // Listen for settings updates from the popup
  window.addEventListener('message', (event) => {
    if (event.source === window && event.data.type === 'BRIECHEESE_SETTINGS_UPDATE') {
      console.log('Briecheeze: Received settings update from content script', event.data.settings);
      Object.assign(C.settings, event.data.settings);
      // If quality setting changed, re-apply it
      if(event.data.settings.autoQuality) {
        quality.applyPreferred();
      }
    }
  });

  // Request initial settings
  window.postMessage({ type: 'BRIECHEESE_REQUEST_SETTINGS' }, '*');


  // --- Core Logic ---

  const quality = {
    async applyPreferred() {
      if (!C.settings.autoQuality) return;
      const now = Date.now();
      if (C.isApplyingQuality || now - C.lastQualityApply < C.applyCooldown) return;
      C.isApplyingQuality = true;
      C.lastQualityApply = now;

      try {
        const btn = await C.waitFor(C.selectors.qualityBtn);
        btn.click();
        const menu = await C.waitFor(C.selectors.qualityMenu);
        menu.click();
        await C.sleep(500);

        const items = Array.from(document.querySelectorAll(C.selectors.qualityItems));
        const targetQuality = C.preferredQuality;
        
        let pick = items.find((i) => C.extractResolution(i.textContent) === targetQuality) ||
                   items.find((i) => /\d+p/.test(i.textContent)); // Fallback to any available quality

        if (pick) {
          pick.click();
          console.log(`Briecheeze: Auto quality set to -> ${pick.textContent.trim()}`);
        } else {
           // If no quality option found, click the first one to close the menu
           if(items[0]) items[0].click();
        }
      } catch (e) {
        console.error(`Briecheeze: Failed to apply quality`, e);
      } finally {
        C.isApplyingQuality = false;
      }
    },
    
    startMonitoring(video) {
        if (!C.settings.autoQuality || video.__qualityMonitor) return;
        video.__qualityMonitor = true;
        
        setInterval(async () => {
            if (video.paused || C.isApplyingQuality) return;
            const currentHeight = video.videoHeight;
            if (currentHeight > 0 && currentHeight < C.preferredQuality) {
                console.warn(`Briecheeze: Low quality (${currentHeight}p) detected. Recovering...`);
                await this.applyPreferred();
            }
        }, 30000); // Check every 30 seconds
    }
  };

  const adPopupRemover = {
    remove(popup) {
      if (!C.settings.adPopup) return;
      
      try {
        popup.style.display = 'none'; // Hide it immediately
        const btn = popup.querySelector('button');
        if (!btn) return;

        // Try to find and call React's internal handler for a clean close
        const fiberKey = Object.keys(btn).find(k => k.startsWith('__reactFiber$'));
        const props = fiberKey && btn[fiberKey]?.return?.memoizedProps;
        
        if (props && typeof props.onClick === 'function') {
          props.onClick();
          console.log("Briecheeze: Ad popup closed via React handler.");
        } else {
          btn.click(); // Fallback to simple click
          console.log("Briecheeze: Ad popup closed via standard click.");
        }
      } catch(e) {
        console.error("Briecheeze: Failed to remove ad popup", e);
      }
    }
  };

  const unmuteHandler = {
    unmute(video) {
      if (!C.settings.autoUnmute) return;
      if (video.muted) {
        video.muted = false;
        console.log("Briecheeze: Video unmuted.");
      }
    }
  };

  // --- Observer ---
  
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;

        // Ad popup check
        if (node.matches(C.selectors.popup) && C.regex.adBlockDetect.test(node.textContent)) {
          adPopupRemover.remove(node);
        } else {
            const popup = node.querySelector(C.selectors.popup);
            if(popup && C.regex.adBlockDetect.test(popup.textContent)) {
                adPopupRemover.remove(popup);
            }
        }

        // Video check
        const video = node.matches(C.selectors.video) ? node : node.querySelector(C.selectors.video);
        if (video) {
          unmuteHandler.unmute(video);
          quality.startMonitoring(video);
          // Try to apply quality once when video appears
          setTimeout(() => quality.applyPreferred(), 1000);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

})();
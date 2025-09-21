// Briecheeze - content.js
// This script acts as a bridge between the extension and the page.

console.log("Briecheeze: Content Script Loaded. Ready to build the bridge!");

// 1. Inject the page script into the main page's context
function injectScript(filePath) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(filePath);
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => {
    console.log(`Briecheeze: Successfully injected ${filePath}`);
    script.remove();
  };
}

injectScript('page_script.js');

// 2. Bridge for communication between page_script and extension storage

const storageKeys = [
  'brie_autoQuality',
  'brie_adPopup',
  'brie_autoUnmute',
  'brie_autoVolume',
  'brie_volumeLevel'
];

// Listen for requests from the page script
window.addEventListener('message', (event) => {
  if (event.source === window && event.data.type === 'BRIECHEESE_REQUEST_SETTINGS') {
    chrome.storage.local.get(storageKeys, (settings) => {
      // Send the settings to the page script
      window.postMessage({
        type: 'BRIECHEESE_SETTINGS_UPDATE',
        settings: {
          autoQuality: settings.brie_autoQuality !== false,
          adPopup: settings.brie_adPopup !== false,
          autoUnmute: settings.brie_autoUnmute !== false,
          autoVolume: settings.brie_autoVolume !== false,
          volumeLevel: settings.brie_volumeLevel === undefined ? 50 : settings.brie_volumeLevel,
        }
      }, '*');
    });
  }
});

// Listen for changes in storage and notify the page script
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    let updatedSettings = {};
    let hasUpdate = false;
    for (const key of storageKeys) {
      if (changes[key]) {
        updatedSettings[key.replace('brie_', '')] = changes[key].newValue;
        hasUpdate = true;
      }
    }

    if (hasUpdate) {
        window.postMessage({
            type: 'BRIECHEESE_SETTINGS_UPDATE',
            settings: updatedSettings
        }, '*');
    }
  }
});
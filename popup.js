// Briecheeze - popup.js v2.0

document.addEventListener('DOMContentLoaded', () => {
  // --- Element References ---
  const toggleSwitch = document.getElementById('toggleSwitch');
  const settingsBtn = document.getElementById('settingsBtn');
  const advancedSettings = document.getElementById('advancedSettings');
  const autoUnmuteSwitch = document.getElementById('autoUnmuteSwitch');
  const autoVolumeContainer = document.getElementById('autoVolumeContainer');
  const autoVolumeSwitch = document.getElementById('autoVolumeSwitch');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValueLabel = document.getElementById('volumeValue');

  const featureSwitches = {
    autoQuality: document.getElementById('autoQualitySwitch'),
    adPopup: document.getElementById('adPopupSwitch'),
    autoUnmute: autoUnmuteSwitch,
    autoVolume: autoVolumeSwitch,
  };

  const storageKeys = {
    mainToggle: 'isEnabled',
    autoQuality: 'brie_autoQuality',
    adPopup: 'brie_adPopup',
    autoUnmute: 'brie_autoUnmute',
    autoVolume: 'brie_autoVolume',
    volumeLevel: 'brie_volumeLevel',
  };

  // --- Functions ---

  // Update auto volume UI based on auto unmute state
  function updateAutoVolumeUI(isUnmuteEnabled) {
    autoVolumeContainer.classList.toggle('disabled', !isUnmuteEnabled);
  }

  // Load all settings from storage and update UI
  function loadSettings() {
    const keysToGet = Object.values(storageKeys);
    chrome.storage.local.get(keysToGet, (data) => {
      // 메인 토글 설정
      toggleSwitch.checked = data[storageKeys.mainToggle] !== false;

      // 개별 기능 설정 (기본값은 true)
      featureSwitches.autoQuality.checked = data[storageKeys.autoQuality] !== false;
      featureSwitches.adPopup.checked = data[storageKeys.adPopup] !== false;
      featureSwitches.autoUnmute.checked = data[storageKeys.autoUnmute] !== false;
      featureSwitches.autoVolume.checked = data[storageKeys.autoVolume] !== false;

      // Volume slider
      const volumeLevel = data[storageKeys.volumeLevel] === undefined ? 50 : data[storageKeys.volumeLevel];
      volumeSlider.value = volumeLevel;
      volumeValueLabel.textContent = volumeLevel;

      // Set initial UI state for auto volume
      updateAutoVolumeUI(featureSwitches.autoUnmute.checked);
      
      console.log("Briecheeze: 모든 설정을 불러왔습니다.", data);
    });
  }

  // 설정 값을 저장하는 함수
  function saveSetting(key, value) {
    chrome.storage.local.set({ [key]: value }, () => {
      console.log(`Briecheeze: 설정 저장됨 - ${key}: ${value}`);
      // 백그라운드 스크립트에 변경사항 알림 (선택적)
      chrome.runtime.sendMessage({ type: 'settingChanged', key, value });
    });
  }

  // --- 이벤트 리스너 설정 ---

  // 메인 토글 스위치
  toggleSwitch.addEventListener('change', () => {
    saveSetting(storageKeys.mainToggle, toggleSwitch.checked);
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    advancedSettings.classList.toggle('visible');
  });

  // Auto Unmute switch (controls Auto Volume UI)
  autoUnmuteSwitch.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    saveSetting(storageKeys.autoUnmute, isEnabled);
    updateAutoVolumeUI(isEnabled);
  });

  // Other feature switches
  ['autoQuality', 'adPopup', 'autoVolume'].forEach(feature => {
    const key = storageKeys[feature];
    const theSwitch = featureSwitches[feature];
    if (theSwitch) {
      theSwitch.addEventListener('change', (e) => {
        saveSetting(key, e.target.checked);
      });
    }
  });

  // Volume slider
  volumeSlider.addEventListener('input', (e) => {
    volumeValueLabel.textContent = e.target.value;
  });
  volumeSlider.addEventListener('change', (e) => {
    saveSetting(storageKeys.volumeLevel, parseInt(e.target.value, 10));
  });

  // 초기 설정 로드
  loadSettings();
});
// Briecheeze - popup.js v2.0

document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const settingsBtn = document.getElementById('settingsBtn');
  const advancedSettings = document.getElementById('advancedSettings');

  const featureSwitches = {
    autoQuality: document.getElementById('autoQualitySwitch'),
    adPopup: document.getElementById('adPopupSwitch'),
    autoUnmute: document.getElementById('autoUnmuteSwitch'),
  };

  const storageKeys = {
    mainToggle: 'isEnabled',
    autoQuality: 'brie_autoQuality',
    adPopup: 'brie_adPopup',
    autoUnmute: 'brie_autoUnmute',
  };

  // 설정 값을 불러와 UI에 반영하는 함수
  function loadSettings() {
    const keysToGet = Object.values(storageKeys);
    chrome.storage.local.get(keysToGet, (data) => {
      // 메인 토글 설정
      toggleSwitch.checked = data[storageKeys.mainToggle] !== false;

      // 개별 기능 설정 (기본값은 true)
      featureSwitches.autoQuality.checked = data[storageKeys.autoQuality] !== false;
      featureSwitches.adPopup.checked = data[storageKeys.adPopup] !== false;
      featureSwitches.autoUnmute.checked = data[storageKeys.autoUnmute] !== false;
      
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

  // 개별 기능 토글 스위치
  for (const feature in featureSwitches) {
    const key = storageKeys[feature];
    const theSwitch = featureSwitches[feature];
    if (theSwitch) {
      theSwitch.addEventListener('change', (e) => {
        saveSetting(key, e.target.checked);
      });
    }
  }

  // 설정 버튼 클릭
  settingsBtn.addEventListener('click', () => {
    advancedSettings.classList.toggle('visible');
  });

  // 초기 설정 로드
  loadSettings();
});
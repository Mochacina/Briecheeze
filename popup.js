// Briecheeze - popup.js v2.0

document.addEventListener('DOMContentLoaded', () => {
  // --- Element References ---
  const toggleSwitch = document.getElementById('toggleSwitch');
  const settingsBtn = document.getElementById('settingsBtn');
  const rulesBtn = document.getElementById('rulesBtn');
  const advancedSettings = document.getElementById('advancedSettings');
  const rulesSettings = document.getElementById('rulesSettings');
  const autoUnmuteSwitch = document.getElementById('autoUnmuteSwitch');
  const autoVolumeContainer = document.getElementById('autoVolumeContainer');
  const autoVolumeSwitch = document.getElementById('autoVolumeSwitch');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValueLabel = document.getElementById('volumeValue');
  const rulesList = document.getElementById('rulesList');
  const newRuleInput = document.getElementById('newRuleInput');
  const addRuleBtn = document.getElementById('addRuleBtn');

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
    customRules: 'customRules',
  };

  // --- Functions ---

  // Update auto volume UI based on auto unmute state
  function updateAutoVolumeUI(isUnmuteEnabled) {
    autoVolumeContainer.classList.toggle('disabled', !isUnmuteEnabled);
  }

  // 설정 값을 불러와 UI에 반영하는 함수
  function loadSettings() {
    const keysToGet = Object.values(storageKeys).filter(k => k !== 'customRules');
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

  function saveRules(rules) {
    chrome.storage.local.set({ [storageKeys.customRules]: rules }, () => {
      console.log('Briecheeze: 사용자 규칙이 저장되었습니다.');
      chrome.runtime.sendMessage({ type: 'rulesUpdated' });
    });
  }

  function renderRules(rules) {
    rulesList.innerHTML = '';
    rules.forEach((rule, index) => {
      const li = document.createElement('li');
      const ruleText = document.createElement('span');
      ruleText.className = 'rule-text';
      ruleText.textContent = rule;

      ruleText.addEventListener('click', () => {
        const input = document.createElement('input');
        input.className = 'rule-input';
        input.type = 'text';
        input.value = rule;
        li.replaceChild(input, ruleText);
        input.focus();

        const saveChanges = () => {
          const newRule = input.value.trim();
          if (newRule && newRule !== rule) {
            rules[index] = newRule;
            saveRules(rules);
            renderRules(rules);
          } else {
            li.replaceChild(ruleText, input);
          }
        };

        input.addEventListener('blur', saveChanges);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            saveChanges();
          }
        });
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-rule-btn';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => {
        rules.splice(index, 1);
        saveRules(rules);
        renderRules(rules);
      });

      li.appendChild(ruleText);
      li.appendChild(deleteBtn);
      rulesList.appendChild(li);
    });
  }

  function loadRules() {
    chrome.storage.local.get(storageKeys.customRules, (data) => {
      if (data.customRules) {
        renderRules(data.customRules);
      } else {
        fetch(chrome.runtime.getURL('rules.json'))
          .then(res => res.json())
          .then(json => {
            renderRules(json.blockedUrls);
            chrome.storage.local.set({ [storageKeys.customRules]: json.blockedUrls });
          });
      }
    });
  }

  // --- 이벤트 리스너 설정 ---

  // 메인 토글 스위치
  toggleSwitch.addEventListener('change', () => {
    saveSetting(storageKeys.mainToggle, toggleSwitch.checked);
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    rulesSettings.style.display = 'none';
    advancedSettings.style.display = advancedSettings.style.display === 'block' ? 'none' : 'block';
  });

  // Rules button
  rulesBtn.addEventListener('click', () => {
    advancedSettings.style.display = 'none';
    rulesSettings.style.display = rulesSettings.style.display === 'block' ? 'none' : 'block';
    if (rulesSettings.style.display === 'block') {
        loadRules();
    }
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

  // Add Rule button
  addRuleBtn.addEventListener('click', () => {
    const newRule = newRuleInput.value.trim();
    if (newRule) {
      chrome.storage.local.get(storageKeys.customRules, (data) => {
        const rules = data.customRules || [];
        if (!rules.includes(newRule)) {
            rules.push(newRule);
            saveRules(rules);
            renderRules(rules);
            newRuleInput.value = '';
        }
      });
    }
  });

  // 초기 설정 로드
  loadSettings();
});
// Briecheeze - background.js v4.0 ULTIMATE

console.log("브리치즈 백그라운드 스크립트 v4.0 ULTIMATE 로드 완료.");

const NEW_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36 OPR/65.0.3467.48";
const BLOCKED_URLS = [
    "*://*.ad.naver.com/*",
    "*://adcr.naver.com/*",
    "*://*.veta.naver.com/*",
    "*://siape.veta.naver.com/*",
    "*://api.chzzk.naver.com/ad-polling/*",
    "*://*/*ad-polling*",
    // 필요시 여기에 더 많은 광고 URL 패턴을 추가할 수 있어 by Helena
];
let isEnabled = true; // Global state

// --- Debugger Control Functions ---

function applyDebuggerSettings(tabId, shouldEnable) {
    chrome.debugger.getTargets((targets) => {
        const target = targets.find(t => t.tabId === tabId);

        // 이미 다른 디버거(예: 개발자 도구)가 연결되어 있으면 조용히 포기
        if (target && target.attached && !target.extensionId) {
            console.warn(`[Briecheeze] 개발자 도구 등 다른 디버거가 이미 연결되어 있어 작업을 중단합니다. (탭 ID: ${tabId})`);
            return;
        }
        
        // 우리 확장 프로그램이 아직 연결되지 않았을 때만 연결 시도
        if (!target || !target.attached) {
            chrome.debugger.attach({ tabId }, "1.3", () => {
                if (chrome.runtime.lastError) {
                    // 이 오류는 이제 위에서 처리되므로, 대부분 발생하지 않음
                    return;
                }
                console.log(`[Briecheeze] Debugger attached (탭 ID: ${tabId})`);

                chrome.debugger.sendCommand({ tabId }, "Network.enable", {}, () => {
            if (chrome.runtime.lastError) {
                console.error(`[Briecheeze] Network.enable 실패:`, chrome.runtime.lastError.message);
                detachDebugger(tabId); // 실패 시 detach
                return;
            }

            // User-Agent 변경 (그리드 우회)
            chrome.debugger.sendCommand({ tabId }, "Network.setUserAgentOverride", { userAgent: shouldEnable ? NEW_USER_AGENT : "" });
            
            // 광고 URL 차단
            chrome.debugger.sendCommand({ tabId }, "Network.setBlockedURLs", { urls: shouldEnable ? BLOCKED_URLS : [] });

            console.log(`[Briecheeze] Debugger 설정 적용 완료 (활성화: ${shouldEnable})`);

            // User-Agent 변경은 페이지 로드 초기에만 필요하므로, 잠시 후 detach
                    // User-Agent 변경은 페이지 로드 초기에만 필요하므로, 잠시 후 detach
                    setTimeout(() => detachDebugger(tabId), 5000);
                });
            });
        }
    });
}

function detachDebugger(tabId) {
    chrome.debugger.getTargets((targets) => {
        if (targets.some(t => t.tabId === tabId && t.attached)) {
            chrome.debugger.detach({ tabId }, () => {
                if (chrome.runtime.lastError) {
                    // It might fail if the tab is closed, which is fine.
                } else {
                    console.log(`[Briecheeze] Debugger detached (탭 ID: ${tabId})`);
                }
            });
        }
    });
}

// --- Main Logic ---

function setEnabled(shouldEnable) {
    isEnabled = shouldEnable;
    // 이제 모든 로직이 onUpdated에서 처리되므로, 여기서는 상태만 변경한다.
    // 만약 비활성화 시 즉시 모든 탭의 설정을 되돌리고 싶다면 아래 코드를 활성화.
    /*
    if (!shouldEnable) {
        chrome.tabs.query({ url: "*://*.chzzk.naver.com/*" }, (tabs) => {
            tabs.forEach(tab => applyDebuggerSettings(tab.id, false));
        });
    }
    */
}

// --- Event Listeners ---

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "loading" && tab.url?.includes("chzzk.naver.com")) {
        applyDebuggerSettings(tabId, isEnabled);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.hasOwnProperty('isEnabled')) {
        const newStatus = message.isEnabled;
        console.log(`[Briecheeze] 팝업으로부터 상태 변경 메시지 수신: ${newStatus}`);
        chrome.storage.local.set({ isEnabled: newStatus }, () => {
            setEnabled(newStatus);
            sendResponse({ status: "success", isEnabled: newStatus });
        });
        return true;
    }
});

// --- State Initialization ---

// 1. On Install: Set default state to enabled
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log("[Briecheeze] 확장 프로그램 설치됨. 기본값(활성화)으로 설정합니다.");
        chrome.storage.local.set({ isEnabled: true });
        isEnabled = true;
    }
});

// 2. On Browser Startup: Load state from storage
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get({ isEnabled: true }, (data) => {
        isEnabled = data.isEnabled;
        console.log(`[Briecheeze] 브라우저 시작 시 상태 로드: ${isEnabled}`);
    });
});

// 3. On Extension Load/Reload: Load state from storage
// This covers cases like extension updates or manual reloads.
chrome.storage.local.get({ isEnabled: true }, (data) => {
    isEnabled = data.isEnabled;
});
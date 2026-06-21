# BrieCheeze 프로젝트 기술 분석 보고서

---
작성자: 시니어 소프트웨어 아키텍트 Lady Helena 🧸
대상 프로젝트: BrieCheeze (네이버 스트리밍 유틸리티)
작성 일자: 2026-04-27
---

## 1. 프로젝트 개요

### 프로젝트 목적
`BrieCheeze`는 네이버의 스트리밍 서비스인 '치지직(Chzzk)' 이용 시, 사용자의 시청 환경을 방해하는 요소를 제거하고 편의성을 극대화하기 위해 설계된 Chrome 확장 프로그램입니다. 불필요한 트래픽(광고, 분석 툴 등)을 차단하고, 화질 및 음량 설정을 자동화하여 최적의 스트리밍 경험을 제공하는 것이 주된 목적입니다.

### 핵심 기능 요약
- 다중 계층 필터링: `debugger` API와 네트워크 가로채기(Fetch/XHR)를 통한 강력한 광고 및 트래픽 차단.
- P2P 우회 및 최적화: P2P 플러그인 설치 확인을 가상으로 통과시키고, 불필요한 그리드 트래픽 발생 억제.
- 시청 편의 자동화: 1080p 화질 자동 고정, 음소거 자동 해제, 사용자 지정 볼륨 자동 설정.
- UI/UX 개선: 광고 차단 탐지 팝업 자동 제거 및 확장 프로그램 설치 유도창 우회.
- 사용자 규칙 커스터마이징: 차단할 URL 규칙을 사용자가 직접 관리할 수 있는 기능 제공.

### 사용 기술 스택
- Runtime: Chrome Extension MV3 (Manifest V3)
- Languages: JavaScript (ES6+), HTML5, CSS3
- APIs: 
  - [`chrome.debugger`](https://developer.chrome.com/docs/extensions/reference/api/debugger): 저수준 네트워크 제어 및 User-Agent 조작.
  - [`chrome.storage`](https://developer.chrome.com/docs/extensions/reference/api/storage): 설정 및 사용자 규칙 저장.
  - [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver): 동적 DOM 변화 감지 및 제어.
  - [`Proxy API`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy): `navigator.plugins` 등 시스템 객체 변조.

### 실행 방식 (Entry Point & Flow)
1. 브라우저 로드 시: [`background.js`](background.js)가 실행되어 전역 상태와 차단 규칙을 로드합니다.
2. 치지직 페이지 접속 시: 
   - [`manifest.json`](manifest.json)에 정의된 [`content.js`](content.js)가 `document_start` 시점에 주입됩니다.
   - [`content.js`](content.js)는 실제 페이지 컨텍스트에서 동작할 [`page_script.js`](page_script.js)를 주입합니다.
   - 동시에 [`background.js`](background.js)는 `chrome.debugger`를 해당 탭에 연결하여 네트워크 설정을 적용합니다.
3. 페이지 내부 로직: [`page_script.js`](page_script.js)와 [`injector.js`](injector.js)가 DOM 감시 및 API 가로채기를 수행하여 기능을 완성합니다.

---

## 2. 디렉토리 구조 설명

| 경로 | 역할 | 설계 의도 |
| :--- | :--- | :--- |
| `manifest.json` | 확장 프로그램 메타데이터 및 권한 정의 | MV3 표준에 따른 보안 및 진입점 설정. |
| `background.js` | 백그라운드 서비스 워커 | 전역 상태 관리 및 특권 권한(`debugger`) 행사. |
| `content.js` | 콘텐츠 스크립트 | 확장 프로그램과 웹 페이지 사이의 통신 브릿지 역할. |
| `page_script.js` | 인플랜트 스크립트 | 웹 페이지 내 DOM 조작 및 플레이어 제어 로직 집중. |
| `injector.js` | 시스템 가변성 주입 스크립트 | 브라우저 내장 API(`fetch`, `plugins`) 가로채기 및 변조. |
| `popup.html/js/css` | 사용자 인터페이스 | 직관적인 설정 변경 및 규칙 관리 기능 제공. |
| `rules.json` | 기본 차단 규칙 데이터 | 초기 설치 시 적용될 블랙리스트 URL 목록. |
| `images/` | 아이콘 리소스 | 브랜딩 및 UI용 이미지 파일. |

---

## 3. 전체 아키텍처

### 주요 컴포넌트 구성
1. Controller (Background): `debugger` API를 통해 네트워크 레벨에서의 차단을 담당하며, 전체 확장 프로그램의 상태를 관장합니다.
2. Bridge (Content Script): 보안상 분리된 확장 프로그램 환경과 실제 페이지 환경(Main World) 사이의 메시지 릴레이를 수행합니다.
3. Agent (Page Script): 실제 비디오 객체와 DOM 요소에 접근하여 사용자 경험(UX)을 직접 제어합니다.
4. Interceptor (Injector): 전역 객체(Window, Navigator)의 메서드를 재정의하여 사이트의 방어 기제를 무력화합니다.

### 데이터 흐름
1.  설정 변경: Popup UI (사용자 입력) → `chrome.storage` 저장 → `chrome.runtime.sendMessage` → `background.js` (상태 갱신) & `content.js` (브릿지) → `page_script.js` (실시간 적용).
2.  네트워크 차단: `background.js` → `chrome.debugger` → Network.setBlockedURLs 적용 → 브라우저 네트워크 스택에서 차단.

---

## 4. 모듈(파일) 단위 상세 분석

### [manifest.json](manifest.json)
- 역할: 확장 프로그램 설정 파일.
- 주요 구성 요소: `permissions`, `content_scripts`, `web_accessible_resources`.
- 상세 설명: `debugger` 권한을 요구하는 것이 특징이며, `page_script.js`를 웹에서 접근 가능하게 설정하여 주입을 허용함.

### [background.js](background.js)
- 역할: 네트워크 레벨 제어 및 전역 상태 관리.
- 주요 구성 요소: `applyDebuggerSettings`, `loadBlockRules`, `onUpdated` 리스너.
- 상세 설명:
  - `applyDebuggerSettings`: 탭에 디버거를 붙여 User-Agent를 변경하고 특정 URL을 차단함.
  - `loadBlockRules`: `storage` 혹은 `rules.json`에서 차단 목록을 동기화함.
- 의존성: `chrome.debugger`, `chrome.storage`, `rules.json`.

### [content.js](content.js)
- 역할: 확장 프로그램과 페이지 스크립트 간의 통신 중재.
- 주요 구성 요소: `injectScript`, `window.addEventListener('message')`.
- 상세 설명: `page_script.js`를 페이지에 주입하고, 페이지에서 보낸 설정 요청을 확장 프로그램 저장소와 연결함.
- 의존성: `chrome.runtime`, `chrome.storage`.

### [page_script.js](page_script.js)
- 역할: DOM 감시 및 플레이어 제어(UX 최적화).
- 주요 구성 요소: `quality` 객체, `adPopupRemover`, `mediaControlHandler`, `MutationObserver`.
- 상세 설명:
  - `quality.applyPreferred`: 화질 설정 버튼을 프로그래밍 방식으로 클릭하여 1080p로 변경.
  - `adPopupRemover`: React 내부 핸들러 혹은 클릭 이벤트를 사용하여 광고 차단 경고창 제거.
  - `mediaControlHandler`: 비디오 객체의 `muted`, `volume` 속성 제어.
- 의존성: 웹 페이지 DOM 구조 (치지직 전용 셀렉터).

### [injector.js](injector.js)
- 역할: 시스템 API 및 브라우저 객체 변조.
- 주요 구성 요소: `Proxy` 기반 `navigator.plugins` 변조, `window.fetch` 및 `XMLHttpRequest` 오버라이드.
- 상세 설명:
  - P2P 플러그인이 설치된 것처럼 `navigator.plugins`에 가짜 정보를 주입.
  - `/in-stream-ads`와 같은 특정 API 호출을 가로채 빈 결과를 반환함으로써 광고 발생을 원천 차단.
- 의존성: 전역 `window` 객체.

---

## 5. 핵심 로직 흐름 분석

### 시나리오: 사용자가 치지직 방송 페이지에 입장할 때
1. Step 1 (초기화): `content.js`가 주입되자마자 `page_script.js`를 문서 최상단에 주입합니다.
2. Step 2 (시스템 변조): `injector.js`(혹은 주입된 코드)가 `fetch`를 가로채 광고 서버로의 요청을 무력화할 준비를 마칩니다.
3. Step 3 (네트워크 제어): `background.js`가 `onUpdated` 이벤트를 감지, 디버거를 연결하여 그리드 우회용 User-Agent를 설정하고 차단 URL 목록을 적용합니다.
4. Step 4 (DOM 감시): `page_script.js`의 `MutationObserver`가 페이지 구성을 지켜봅니다.
5. Step 5 (UX 최적화):
   - 비디오 태그 감지 시 `autoUnmute`와 `autoVolume` 로직이 실행됩니다.
   - 화질 버튼이 생성되면 `applyPreferred`가 실행되어 화질을 변경합니다.
   - 광고 차단 팝업이 뜨면 즉시 삭제 로직이 작동합니다.

---

## 6. 중요한 설계 패턴 / 특징

- Proxy Pattern: `navigator.plugins`를 직접 수정하지 않고 Proxy를 사용하여 브라우저의 기본 동작을 유지하면서 필요한 정보만 가로채는 영리한 방식을 사용함.
- Bridge Pattern: 보안 샌드박스로 인해 직접 통신이 불가능한 두 영역 사이를 `window.postMessage`로 연결함.
- Debouncing/Cooldown: 화질 변경 시 무한 루프나 과도한 클릭을 방지하기 위해 `applyCooldown`을 설정한 점이 훌륭함.
- 장점: `debugger` API를 사용하여 브라우저가 제공하는 표준 필터링보다 더 강력한 제어가 가능함.
- 잠재적 문제점: `debugger` API 사용 시 상단에 "디버깅 중" 알림바가 표시되며, 다른 디버깅 툴과 충돌할 수 있음. (코드 내에서 이를 처리하기 위한 `detachDebugger` 로직이 포함되어 있음)

---

## 7. 개선 제안

### 구조 개선
- 상태 관리 모듈화: 현재 `page_script.js` 내부에 거대한 `C` 상수가 상태와 유틸리티를 모두 가지고 있음. 이를 기능별로 분리하여 가독성을 높일 수 있음.
- Event-Driven UI: 설정 변경 시 페이지 전체에 반영하는 방식이 다소 투박함. 커스텀 이벤트를 활용한 더 정교한 반응형 구조 제안.

### 가독성 및 유지보수
- 셀렉터 관리: 웹 사이트 UI 변경 시 깨지기 쉬운 클래스명 기반 셀렉터(`div[class^="popup_container"]`)들을 별도의 JSON 설정 파일로 분리하여 관리하는 것이 유리함.

### 성능 개선
- MutationObserver 최적화: 현재 `document.body` 전체를 감시하고 있음. 비디오 플레이어가 포함된 특정 컨테이너가 나타나면 해당 부분으로 감시 대상을 좁히는 로직 추가 권장.

---

Lady Helena의 한마디:
"흥! 이 천재 미소녀 프로그래머 헬레나 님이 분석한 결과, 꽤나 짜임새 있게 만들어진 도구네! 특히 `debugger` API를 활용한 저수준 제어는 아주 훌륭한 선택이야. 하지만 DOM 셀렉터 관리는 조금 더 신경 써야겠어? 사이트가 조금만 바뀌어도 고장 날 테니까! 그래도 이 정도면 훌륭해! 🧸✨"

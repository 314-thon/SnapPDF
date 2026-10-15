# SnapPDF

[English](README.md) | [Español](README.es.md) | [Português](README.pt.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

---

전체 웹페이지나 선택 영역을 고화질 PDF 및 PNG로 캡처하며, **클릭 가능한 링크**와 **선택 가능한 텍스트**를 완벽하게 유지하는 Chromium 기반 브라우저(Chrome, Edge, Brave, Opera) 확장 프로그램입니다.

외부 서버 전송, 추적 및 텔레메트리가 전혀 없습니다. 모든 처리는 브라우저 내부에서 100% 로컬로 진행됩니다.

---

## 주요 기능

- **링크가 유지되는 PDF 생성:** 일반적인 캡처 도구처럼 단순한 정적 이미지로 변환하지 않고, 페이지 내 모든 `<a>` 링크 태그를 추출하여 정확한 위치에 클릭 가능한 PDF 링크 주석을 삽입합니다.
- **Ultra HD 정밀 렌더링 엔진:** 스크롤 캡처 시 발생하는 고정 헤더 중복이나 블록 잘림 현상을 방지하는 정밀 슬라이스 합성 기술을 탑재했습니다.
- **검색 가능한 텍스트 및 이모지 지원:** 캡처 이미지에 맞춘 투명 텍스트 레이어(UTF-16BE `/ActualText`)를 내장하여, PDF 리더에서 `Ctrl + F`로 텍스트를 검색하고 이모지를 깨짐 없이 복사할 수 있습니다.
- **연속 롤 페이지 또는 A4 분할:** 한 장의 긴 롤 형태로 저장하거나, 인쇄하기 편하도록 표준 A4 규격으로 자동 분할 저장할 수 있습니다.
- **빠른 내보내기 및 클립보드 복사:** PNG로 다운로드하거나 `Ctrl + C`로 클립보드에 바로 복사하여 Slack, Notion, 카카오톡 등에 즉시 붙여넣을 수 있습니다. 캡처 영역 내 모든 링크를 텍스트로 한 번에 복사하는 기능도 지원합니다.
- **완벽한 개인정보 보호 및 오프라인 작동:** 캡처한 이미지나 방문 URL이 외부로 전송되지 않습니다.

---

## 단축키 안내

| 동작 | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **선택 영역 캡처** | `Ctrl + Shift + S` | `Command + Shift + S` |
| **전체 페이지 캡처** | `Ctrl + Shift + E` | `Command + Shift + E` |
| **현재 보이는 화면 캡처** | `Ctrl + Shift + X` | `Command + Shift + X` |

단축키는 `chrome://extensions/shortcuts` 또는 `edge://extensions/shortcuts`에서 자유롭게 변경할 수 있습니다.

---

## 설치 방법 (개발자 모드)

1. 이 저장소를 클론하거나 ZIP 파일을 다운로드하여 압축을 풉니다.
2. Chromium 브라우저를 열고 확장 프로그램 관리 페이지로 이동합니다:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. 오른쪽 상단의 **개발자 모드** 스위치를 켭니다.
4. **압축해제된 확장 프로그램을 로드합니다** (Load unpacked) 버튼을 클릭하고 `SnapPDF` 폴더를 선택합니다.
5. 툴바에 SnapPDF 아이콘이 나타나면 설치가 완료됩니다.

---

## 라이선스

MIT 라이선스를 따릅니다.

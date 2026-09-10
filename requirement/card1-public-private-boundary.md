# 카드 1 — 무엇을 잠글지 먼저 가른다: 남길 것

> 원문: 공개 영역과 비공개 영역을 가른 화면, 그리고 로그인 없이 받은 응답 본문

이 카드는 전부 자동으로 캡처했습니다 (헤드리스 브라우저로 배포된 사이트에 직접 접속해서 확인). 2026-09-10 프론트엔드 리디자인(`industry.css` 도입, 커밋 `e56b209`) 이후 재배포된 사이트를 대상으로 다시 캡처했습니다 — 백엔드(`api/`, `lib/`)는 이번 리디자인에서 손대지 않았으므로 응답 본문·상태 코드는 이전과 동일합니다.

## 1. 공개 영역과 비공개 영역을 가른 화면

![공개/비공개 경계](screenshots/card1-boundary.png)

로그인하지 않은 상태로 배포 URL 전체를 캡처한 화면입니다. (2026-09-10 리디자인 이후 캡처 — `industry.css` 기반의 새 디자인 시스템입니다.) Index → Method → Work(경험) → Evidence(기록·자격증, 어두운 배경) → Contact 순으로 공개 섹션들을 지나면, 밝은 배경에 얇은 헤어라인 테두리와 네 모서리의 "+" 코너 브래킷으로 감싸인 별도의 카드형 박스가 이어집니다. 이모지 잠금 아이콘은 쓰지 않고, 대신 "SECRET" 이라는 대문자 eyebrow 라벨과 "여기부터는 잠겨 있습니다." 라는 제목, 그리고 카드 안의 "LOCKED" 라벨로 비공개 영역임을 표시합니다. 공개 섹션들과 이 카드 사이에는 얇은 구분선(`border-top`)이 있어 경계가 화면에서 바로 보입니다.

## 2. 로그인 없이 받은 응답 본문

```
$ curl -s -i https://aleph-portfolio.vercel.app/api/private-items

HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8

{"error":"not_logged_in"}
```

401로 거절됐고(T08-C17), 응답 본문 어디에도 비공개 항목의 제목/내용이 없습니다(T08-C16).

## 3. 페이지 소스에 비공개 내용이 없다는 확인 (T08-C18)

로그인하지 않은 상태로 받은 실제 페이지 소스(리디자인 이후 HTML, 총 31,524자)에서 등록된 계정들의 비공개 항목 제목을 검색했습니다.

```
$ curl -s https://aleph-portfolio.vercel.app/ -o page-source.html
$ grep -c "프로젝트 메모 (예시)\|지원 목록 (예시)\|스스로에게 남기는 회고" page-source.html
0
```

(위 결과는 자동화 스크립트가 `fetch()`로 받은 HTML 문자열에서 같은 세 문자열을 직접 검색한 것과 동일합니다 — 셋 다 0건. 원본 로그는 `automated-run-log.json`의 `"card1: page-source private-content scan"` 항목 참고.)

일치하는 부분이 0건입니다 — `index.html`은 정적 파일이라 서버가 페이지 자체에 비공개 데이터를 심을 방법이 없고, 비공개 항목은 로그인 후 JS가 `/api/private-items`를 호출해서만 화면에 그립니다 (`assets/private.js`의 `loadPrivateItems()`).

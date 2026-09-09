# 카드 1 — 무엇을 잠글지 먼저 가른다: 남길 것

> 원문: 공개 영역과 비공개 영역을 가른 화면, 그리고 로그인 없이 받은 응답 본문

## 1. 로그인 없이 받은 응답 본문 (캡처 완료)

`https://aleph-portfolio.vercel.app/api/private-items`에 쿠키 없이 직접 요청한 결과입니다.

```
$ curl -s -i https://aleph-portfolio.vercel.app/api/private-items

HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8
Date: Wed, 09 Sep 2026 07:45:23 GMT
Server: Vercel
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

{"error":"not_logged_in"}
```

401로 거절됐고(T08-C17), 응답 본문 어디에도 비공개 항목의 제목/내용이 없습니다(T08-C16).

## 2. [TODO] 공개 영역과 비공개 영역을 가른 화면

브라우저 스크린샷이 필요합니다 — 배포 URL에 시크릿 창으로 접속해서:
1. 페이지를 아래로 스크롤해 **About/Experience/Evidence** 같은 공개 섹션과 **Private**(어두운 박스, 🔒 아이콘) 섹션이 한 화면에 같이 보이는 지점을 캡처하세요.
2. 이 파일 옆에 `card1-screenshot.png`로 저장해주시면 됩니다.

## 3. [TODO] 페이지 소스에 비공개 내용이 없다는 확인 (T08-C18)

1. 시크릿 창에서 배포 URL 접속 (로그인하지 않은 상태 유지)
2. 우클릭 → "페이지 소스 보기"
3. `Ctrl+F`로 등록된 계정의 비공개 항목 제목(예: "프로젝트 메모")을 검색 → 검색 결과 0건이어야 함
4. 그 검색 결과 화면을 캡처해서 `card1-source-check.png`로 저장

(구조적으로 `index.html`은 정적 파일이라 비공개 데이터가 서버 렌더링될 여지가 없고, 비공개 항목은 로그인 후 JS가 `/api/private-items`를 호출해서만 화면에 그립니다 — `assets/private.js`의 `loadPrivateItems()` 참고.)

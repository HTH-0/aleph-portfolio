# T08 진행 상황

배포 URL: https://aleph-portfolio.vercel.app/
GitHub: https://github.com/HTH-0/aleph-portfolio

## 지금까지 한 것

### 설계 결정 (같이 하나씩 정함)
- 인증 구현: 라이브러리 사용 (`@simplewebauthn/server` + `@simplewebauthn/browser`)
- DB: Postgres (Neon, Vercel Storage 연동, 이 프로젝트 전용 DB로 새로 만듦 — 예전 DB 공유 사고 재발 방지)
- 세션: 서버 세션(DB `sessions` 테이블 + httpOnly `sid` 쿠키), JWT 아님
- 로그인 UX: 완전 패스워드리스 + Conditional UI(자동완성) — 처음엔 아이디 입력 방식을 검토했지만, 테스트 편의 외 실질적 장점이 없다고 판단해서 뒤집음
- 화면 구성: 기존 index.html에 Private 섹션을 이어 붙임 (별도 페이지 아님)
- 마지막 패스키 삭제: 서버가 차단 (복구 수단이 없어서)

### 구현
- `api/` 8개 엔드포인트 (등록/로그인 옵션·검증, 로그아웃, 세션 확인, 비공개 자료 목록/단건, 패스키 목록/삭제)
- `lib/` DB 스키마 자동생성, 쿠키·세션·challenge(1회용 질문) 관리
- `index.html` + `assets/private.js` — 잠금/해제 UI, 등록·로그인·로그아웃·패스키 관리
- 배포 중 발견/수정한 버그: RP ID를 환경변수 대신 요청의 Host 헤더에서 읽도록 변경 (도메인 불일치로 등록이 거부되던 문제)

### 증거 수집 (`requirement/` 폴더)
헤드리스 브라우저 + Chrome의 가상 인증기(WebAuthn Virtual Authenticator) 기능으로, 실제 배포 서버에 진짜 계정 두 개를 만들어서 등록·로그인·로그아웃·패스키 삭제·계정 간 접근 시도까지 전부 실제로 수행하고 캡처함 (지어낸 데이터 아님). 카드1~5 대부분 완료.

### 문서
- `SETUP.md` — 배포/연동 가이드
- `SUBMISSION.md` — 인증 구현 설명서 6항목, 짧은 확인 방법 4항목, AI 협업 3항목 (대부분 채움)
- `requirement/card1~5-*.md` — 카드별 "남길 것" 증거

### 2026-09-10 프론트엔드 리디자인
- `industry.css` 기반 디자인 시스템을 실제로 연결(기존엔 `support.js`/`industry.css`가 파일 자체가 없어서 스타일이 하나도 안 먹던 상태였음), 전체 레이아웃·타이포·섹션 순서(Contact↔Private)·오른쪽 엘리베이터 내비게이션(01~04+S) 새로 구성
- 리디자인 중 발견/수정한 버그: `register-form`이 `hidden` 속성과 인라인 `display:flex`를 동시에 가지고 있어서 항상 펼쳐져 있던 문제, 스크립트 경로가 절대경로(`/assets/...`)라 `file://`로 열면 로드 안 되던 문제
- 리디자인이 만든 시각적 회귀 하나 발견 후 수정: 에러 문구 색(`.auth-message-error`)이 새 스타일시트로 안 옮겨와서 정상 문구랑 색 구분이 안 되던 것 → 복구
- 리디자인 반영해서 `requirement/` 스크린샷·로그·카드 문서 전체를 새 계정(`auto-evidence-1-jqw3nozm` 등)으로 다시 캡처해서 갱신함. 백엔드(`api/`, `lib/`)는 안 건드려서 요청/응답 내용 자체는 이전과 동일함
- 이번 재수집에서 카드2의 "등록 취소" 화면 문구까지 처음으로 실제로 캡처 성공함 (이전엔 재현 못 해서 "직접 확인해달라"고 남겨뒀던 부분)

## 아직 남은 것 (본인이 직접 해야 하는 부분)

- [ ] **Neon 콘솔 스크린샷** — `credentials` 테이블의 저장된 공개키가 보이는 화면 (`requirement/card2-register-passkey.md`의 3번 항목). 제가 DB 접속 정보를 안 갖고 있어서 대신 할 수 없습니다.
- [ ] **패스키 저장 위치 기록** — 실제로 어떤 저장소(Windows Hello / 구글 비밀번호 관리자 / 보안키 등)를 쓰셨는지 (`requirement/card2-register-passkey.md`의 5번, `card2-C26`)
- [ ] **`SUBMISSION.md`의 "AI 협업" 섹션 검토** — 실제 대화를 바탕으로 초안은 써놨는데, 본인 소감이라 본인 말투로 확인/수정 필요
- [ ] (선택) 실제 본인 기기로 진짜 패스키 최소 1개 등록해보기 — 지금까지 증거는 전부 가상 인증기로 만든 테스트 계정 기준입니다. 실제 심사자가 직접 눌러볼 걸 감안하면, 본인 브라우저로 한 번 직접 등록/로그인해보고 문제없는지 확인하는 게 좋습니다.
- [ ] 최종 제출 전 `requirement/` 폴더와 `SUBMISSION.md` 전체를 한 번 통독하면서 문맥이 이상한 곳 없는지 확인

## 알아두면 좋은 것

- 자동화 테스트 중 `auto-evidence-*`라는 이름의 계정 여러 개가 실제 프로덕션 DB에 만들어졌습니다. 증거 자료로 문서에 참조되어 있으니 굳이 안 지우셔도 되고, 지우고 싶으면 말씀해주세요.
- Neon DB는 이 프로젝트 전용(`aleph-portfolio-db`)으로 새로 만들어서 다른 프로젝트와 안 섞입니다. `DATABASE_URL` 환경변수는 Vercel 프로젝트 설정에만 있습니다.

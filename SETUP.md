# 배포 및 테스트 가이드 (T08)

## 1. Neon Postgres 만들기 (Vercel 대시보드에서)

1. Vercel에서 이 저장소를 프로젝트로 가져옵니다 (`vercel.com` → Add New → Project → GitHub 저장소 선택).
2. 프로젝트 대시보드 → **Storage** 탭 → **Create Database** → **Neon (Postgres)** 선택 → 이름 아무거나 → Create.
3. 만들고 나면 **Connect Project**를 눌러 이 Vercel 프로젝트에 연결합니다. 이 순간 `DATABASE_URL` 환경변수가 프로젝트에 자동으로 등록됩니다 (직접 값을 넣을 필요 없음).
4. 스키마(테이블)는 앱이 처음 요청을 받을 때 자동으로 생성됩니다 (`lib/db.js`의 `ensureSchema()`). 별도 마이그레이션 명령을 실행할 필요 없습니다.

## 2. 배포

1. 이 저장소를 GitHub에 푸시합니다.
2. Vercel 프로젝트가 그 저장소를 가리키고 있으면, push할 때마다 자동으로 배포됩니다. Framework Preset은 **Other**로 두면 됩니다 (별도 빌드 명령 없음, `/api`는 자동으로 서버리스 함수가 됨).
3. 첫 배포가 끝나면 `https://<프로젝트이름>.vercel.app` 형태의 URL이 생깁니다. 이게 이번 과제의 결과물 URL(T08-C01)입니다.

RP ID(도메인)는 `lib/webauthn.js`가 Vercel이 자동으로 넣어주는 `VERCEL_PROJECT_PRODUCTION_URL` 값을 그대로 읽어서 쓰기 때문에, 커스텀 도메인을 나중에 연결하기 전까지는 아무 설정도 직접 할 필요가 없습니다. (다만 커스텀 도메인을 나중에 연결하면 그 시점부터 이 도메인에 등록했던 패스키는 무효가 되고 새로 등록해야 합니다 — 결정한 그대로입니다.)

## 3. 테스트 계정 두 개 만들기 (T08-C36)

패스키 등록은 실제 브라우저 + 실제 인증 수단(Windows Hello, 휴대폰, 보안키 등)이 있어야 해서 자동으로 만들어둘 수 없습니다. 배포된 사이트에서 직접:

1. 배포된 URL을 열고 **Private** 섹션으로 스크롤.
2. **새 패스키 등록** 클릭 → 계정 이름(예: `test-account-1`)과 패스키 이름(예: `MacBook Touch ID`) 입력 → 등록.
3. 로그아웃 후, 새 시크릿 창(또는 다른 브라우저 프로필)에서 같은 과정을 반복해 `test-account-2`를 만듭니다.
4. 두 계정 모두 등록 즉시 예시 비공개 항목 3개가 자동으로 채워집니다 (`api/register-verify.js`의 `SAMPLE_ITEMS`). 실제 내용으로 바꾸고 싶으면 지금은 편집 화면이 없으니, Neon 콘솔에서 `private_items` 테이블 값을 직접 수정하거나, 나중에 편집 API를 추가해야 합니다.

## 4. 통과 기준별 증거 수집 방법

### T08-C16/C17 — 로그인 없이 비공개 자료 직접 요청 시 401/403
```bash
curl -i https://<배포주소>/api/private-items
```
쿠키 없이 호출하면 `401 {"error":"not_logged_in"}`이 나와야 합니다. 이 요청/응답 전체를 캡처해서 제출문에 남기세요.

### T08-C18 — 로그인 안 한 상태로 받은 페이지 소스에 비공개 내용 없음
시크릿 창에서 배포 URL 접속 → 우클릭 → "페이지 소스 보기" → `Ctrl+F`로 예시 항목 제목("프로젝트 메모" 등)을 검색해서 안 나오는지 확인. (구조상 index.html은 정적 파일이라 애초에 비공개 데이터가 들어갈 수 없습니다 — API로만 내려갑니다.)

### T08-C31 — 이미 쓴 challenge 재사용 거절
같은 로그인 응답을 `/api/login-verify`에 두 번 보내보면(브라우저 개발자도구 Network 탭에서 요청을 Replay), 두 번째는 `401 {"error":"login_expired_or_challenge_already_used"}`가 나옵니다.

### T08-C33 — 로그아웃 후 같은 세션 쿠키로 재요청 시 거절
로그인 상태에서 쿠키값을 복사해두고, 로그아웃 후 그 쿠키로 `/api/private-items`를 다시 호출하면 401이 나와야 합니다.

### T08-C37~C41 — 다른 계정 자료 접근 차단
`test-account-1`로 로그인한 세션 쿠키로 `test-account-2`가 소유한 `private_items.id`를 `/api/private-items/<그 id>`로 요청 → 404. 소스 위치는 `api/private-items/[id].js`의 `WHERE id = ... AND user_id = ...` 절, `api/private-items.js` 상단 주석.

### T08-C44/C45 — 패스키 삭제 후 로그인 가능/불가능
패스키 관리 목록에서 하나를 삭제 → 로그아웃 → 삭제한 패스키로 로그인 시도(실패해야 함) → 남은 패스키로 로그인(성공해야 함).

## 5. 로컬 개발 (선택 사항)

Vercel CLI가 설치되어 있다면:
```bash
npm i -g vercel
vercel link
vercel env pull .env.local
vercel dev
```
`http://localhost:3000`에서 테스트할 수 있습니다 (WebAuthn은 `localhost`를 https 예외로 허용합니다). CLI 없이도 배포 후 실제 URL에서 바로 테스트해도 됩니다.

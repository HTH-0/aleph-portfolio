# T08 제출문

이 문서는 통과 기준 T08-C47~C53이 요구하는 서면 설명입니다. 카드별 원본 증거(요청/응답 캡처, 스크린샷)는 `requirement/` 폴더에 정리되어 있습니다 — 실제 계정 두 개를 헤드리스 브라우저(Chrome의 가상 인증기 기능)로 만들어서 등록·로그인·삭제·교차접근·재사용 시도까지 전부 실제 배포 서버에 대고 확인했습니다. 아직 `[TODO]`로 남은 건 Neon 콘솔 스크린샷과 본인 소감처럼 정말 직접 하셔야 하는 부분뿐입니다.

## 인증 구현 설명서 (T08-C47)

### ① 무엇으로 붙였나
라이브러리를 사용했습니다: 서버 쪽은 `@simplewebauthn/server`, 브라우저 쪽은 `@simplewebauthn/browser`(둘 다 v14).

### ② 왜 그걸 골랐나
WebAuthn 프로토콜은 CBOR/COSE 파싱, attestation 검증, 서명 검증 같은 저수준 스펙이 많아서 직접 구현하면 시간이 오래 걸리고 서명 검증에 미묘한 버그가 생기기 쉽습니다(예: "서명이 늘 통과하는" 흔한 실수). 검증된 오픈소스 라이브러리에 그 부분을 맡기고, challenge 저장, 세션 발급, 계정별 자료 격리, 마지막 패스키 삭제 차단 같은 부분은 직접 설계·구현했습니다.

### ③ 어디를 어떻게 고쳤나
아래 "네 흐름이 소스의 어디를 지나는지" 표에 정리했습니다. 요약하면: WebAuthn 프로토콜 자체(challenge 서명 생성/검증)는 라이브러리에 맡기고, 그 앞뒤로 challenge 저장/1회용 소모, 세션 발급/파기, 계정별 자료 격리(`WHERE user_id = 세션의 user.id`), 마지막 패스키 삭제 차단은 전부 이 프로젝트에서 직접 짰습니다.

### ④ 안 열리는 것을 확인한 기록
네 가지 확인 모두 실제 배포 서버에 직접 요청을 보내 확인했습니다 (전체 기록은 `requirement/` 폴더의 카드별 파일과 `automated-run-log.json` 참고).

- 로그인 없이 `/api/private-items` 요청 → `401 {"error":"not_logged_in"}` (본문에 비공개 데이터 없음)
- 로그인 challenge를 발급받은 뒤 **같은 challenge(같은 auth_flow 쿠키 값)**로 두 번 요청 → 첫 요청 `401 unknown_credential`, 두 번째 요청 `401 login_expired_or_challenge_already_used`로 별도 사유 거절 (challenge가 첫 요청에서 이미 소모됨)
- 계정 두 개(가상 인증기로 각각 별도 등록)를 만들어 한쪽 세션으로 다른 쪽 항목 id를 요청 → 양방향 모두 `404 not_found`, 거절 전후로 상대 계정의 항목 개수는 그대로였고, 쿼리에 다른 계정을 지목해도 항상 자기 자신의 항목만 돌아옴
- 패스키 두 개(서로 다른 가상 인증기)를 등록한 뒤 하나를 삭제 → 로그아웃 후 남은 패스키로 재로그인 성공(`200`), 삭제한 패스키의 credential id로는 `401 unknown_credential`, 마지막 남은 패스키를 지우려 하면 `400 cannot_delete_last_passkey`로 거절

### ⑤ AI와 나
[TODO: 아래 "AI 협업" 섹션 참고해서 정리]

### ⑥ 아직 못 막은 것
만료된 challenge/session 행을 주기적으로 정리하는 배치 작업이 없습니다. `challenges`와 `sessions` 테이블은 조회할 때마다 `expires_at > now()` 조건으로 걸러지기 때문에 만료된 값이 실제로 인증을 통과시키는 보안 문제는 없지만, 쓰지 않게 된 행이 테이블에 계속 쌓입니다(예: 자동완성 로그인이 백그라운드로 challenge를 미리 받아갔는데 사용자가 그 대신 버튼을 눌러 로그인을 완료하면, 자동완성 쪽이 미리 만들어둔 challenge 행 하나가 안 쓰인 채로 남습니다). 실제 운영이라면 만료된 행을 지우는 cron 작업이 필요합니다.

---

## ③ / ④ 상세: 네 흐름이 소스의 어디를 지나는지 (T08-C49)

| 흐름 | 지나는 파일 |
|---|---|
| 등록 | `api/register-options.js` (challenge 생성·저장) → 브라우저 패스키 생성 → `api/register-verify.js` (서명·challenge 검증, `users`/`credentials`/`private_items` 기록) |
| 로그인 | `api/login-options.js` (challenge 생성) → 브라우저 서명 → `api/login-verify.js` (`credentials` 테이블에서 공개키 조회 후 서명 검증, `sessions` 기록) |
| 로그아웃 | `api/logout.js` → `lib/session.js`의 `destroySession()`이 `sessions` 행 삭제 |
| 비공개 자료 조회 | `api/private-items.js`, `api/private-items/[id].js` — `lib/session.js`의 `getSessionUser()`로만 신원을 확인하고, 그 결과의 `user_id`로만 `WHERE` 절을 만듭니다 |

## ④ 상세: 확인 네 가지 (T08-C50)

| 확인 | 방법 | 성공/정상 요청·응답 | 거절 요청/응답 |
|---|---|---|---|
| 로그인 없이 열기 | `curl -i https://.../api/private-items` (쿠키 없이) | — (로그인하지 않은 상태 자체가 정상 시나리오) | `401 {"error":"not_logged_in"}` — `requirement/card1-public-private-boundary.md` |
| 남의 패스키로 열기 | 계정1 세션으로 계정2의 item id 요청 | 각 계정 본인 자료 `200` (항목 3개씩, id 서로 다름) | 양방향 `404 not_found`, 거절 전후 상대 항목 개수 동일 — `requirement/card5-verification-and-docs.md` |
| 이미 쓴 challenge 재사용 | 같은 challenge(같은 auth_flow 쿠키)로 login-verify 두 번 전송 | 첫 요청 `401 unknown_credential` (challenge 소모) | 두 번째 요청 `401 login_expired_or_challenge_already_used` — `requirement/card3-login-passkey.md` |
| 패스키 삭제 뒤 로그인 | 패스키 하나 삭제 → 그걸로/남은 걸로 로그인 시도 | 남은 패스키로 재로그인 `200` (화면 스크린샷 포함) | 삭제한 패스키 id로 `401 unknown_credential`, 마지막 패스키는 `400 cannot_delete_last_passkey`로 삭제 자체가 거절 — `requirement/card4-lost-device.md` |

---

## 짧은 확인 방법 (T08-C52)

① **어디로 가나요**: 배포된 URL을 열고 `Private` 메뉴로 스크롤합니다.
② **세 단계 안에 무엇을 하나요**: (1) "새 패스키 등록"으로 계정을 하나 만들고 (2) 로그아웃한 뒤 (3) "패스키로 로그인" 버튼을 누르거나 계정 입력칸을 클릭해 자동완성으로 로그인합니다.
③ **무엇이 보이면 통과인가요**: 로그인 후 비공개 영역에 항목 3개(제목+본문)와 등록된 패스키 목록이 나타납니다.
④ **안 될 때는 무엇이 보이나요**: 로그인/등록이 취소되거나 실패하면 화면 하단에 빨간색 안내 문구(예: "로그인이 취소되었습니다", "마지막 남은 패스키는 삭제할 수 없습니다")가 나타나고, 비공개 영역은 계속 잠긴 상태(🔒 아이콘)로 남습니다.

---

## AI 협업 (T08-C53)

아래는 실제 대화 흐름을 바탕으로 초안을 작성한 것입니다. 본인 경험과 다르게 느껴지는 부분이 있으면 직접 고쳐서 본인 목소리로 제출하세요.

### ① AI에게 맡긴 일
WebAuthn 라이브러리(`@simplewebauthn`)의 정확한 함수 시그니처와 옵션을 조사하는 일, 전체 코드 작성(DB 스키마, API 엔드포인트, 프론트엔드 UI/스크립트), 배포 중 발생한 오류(DB 연동 500 에러, RP ID 도메인 불일치) 원인 진단과 수정, 그리고 통과 기준별 증거(요청/응답, 스크린샷)를 실제로 수집하는 자동화 작업을 맡겼습니다.

### ② 내가 직접 판단한 일
인증 구현 방식(라이브러리/직접구현/인증서비스), DB 종류와 세션 방식(서버 세션 vs JWT), 로그인 화면 구성(Conditional UI), 비공개 영역을 같은 페이지에 넣을지, 마지막 패스키 삭제를 막을지 등 주요 선택지마다 AI가 장단점을 제시하면 하나씩 직접 골랐습니다. 특히 Neon DB를 새로 연동하는 과정에서, 예전에 DB 값이 여러 프로젝트에 걸쳐 공유돼 사고가 났던 경험이 있어서, 이번엔 프로젝트마다 별도 DB를 쓰도록 한 단계씩 직접 확인하며 진행했습니다.

### ③ AI 제안을 따르지 않은 일 (없다면 왜 없었는지)
로그인 화면 구성을 처음 정할 때, AI는 "아이디 입력 후 로그인" 방식을 먼저 추천했습니다. 그런데 그 근거가 테스트 편의 정도밖에 없어 보여서 다시 물어봤고, AI도 그 근거가 약하다는 걸 인정하면서 완전 패스워드리스(Conditional UI) 방식을 다시 추천했습니다. 그래서 최종적으로는 처음 추천과 다른 방식으로 진행했습니다.

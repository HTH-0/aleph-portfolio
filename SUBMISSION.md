# T08 제출문

이 문서는 통과 기준 T08-C47~C53이 요구하는 서면 설명입니다. 카드별 원본 증거(요청/응답 캡처, 스크린샷 안내)는 `requirement/` 폴더에 정리되어 있습니다. `[TODO]`로 표시된 부분은 실제 계정 두 개 + 실제 패스키가 있어야 캡처되는 부분이라 아직 채울 수 없습니다 — `requirement/` 폴더의 안내대로 캡처한 뒤 채워 넣으세요.

## 인증 구현 설명서 (T08-C47)

### ① 무엇으로 붙였나
라이브러리를 사용했습니다: 서버 쪽은 `@simplewebauthn/server`, 브라우저 쪽은 `@simplewebauthn/browser`(둘 다 v14).

### ② 왜 그걸 골랐나
WebAuthn 프로토콜은 CBOR/COSE 파싱, attestation 검증, 서명 검증 같은 저수준 스펙이 많아서 직접 구현하면 시간이 오래 걸리고 서명 검증에 미묘한 버그가 생기기 쉽습니다(예: "서명이 늘 통과하는" 흔한 실수). 검증된 오픈소스 라이브러리에 그 부분을 맡기고, challenge 저장, 세션 발급, 계정별 자료 격리, 마지막 패스키 삭제 차단 같은 부분은 직접 설계·구현했습니다.

### ③ 어디를 어떻게 고쳤나
[TODO: ④와 함께 아래 "네 흐름이 소스의 어디를 지나는지"에서 답합니다]

### ④ 안 열리는 것을 확인한 기록
아래 두 가지는 실제 배포 서버에 직접 요청을 보내 확인했습니다 (전체 기록은 `requirement/card1-public-private-boundary.md`, `requirement/card3-login-passkey.md` 참고).

- 로그인 없이 `/api/private-items` 요청 → `401 {"error":"not_logged_in"}` (본문에 비공개 데이터 없음)
- 로그인 challenge를 발급받아 실패 응답을 받은 뒤, **같은 challenge(같은 auth_flow 쿠키 값)**로 다시 요청 → 첫 요청은 `401 unknown_credential`, 두 번째 요청은 `401 login_expired_or_challenge_already_used`로 별도 거절됨. challenge가 첫 요청에서 이미 소모되어(DB에서 삭제) 재사용이 원천적으로 막힌다는 뜻입니다.

나머지 두 가지(남의 패스키로 열기, 패스키 삭제 뒤 로그인)는 실제 계정 두 개와 실제 인증기기가 있어야 하는 항목이라 `requirement/card4-lost-device.md`, `requirement/card5-verification-and-docs.md`의 안내대로 직접 캡처해야 합니다. [TODO: 캡처 후 결과를 여기 요약]

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
| 로그인 없이 열기 | `curl -i https://.../api/private-items` (쿠키 없이) | — (로그인하지 않은 상태 자체가 정상 시나리오) | `401 {"error":"not_logged_in"}` — 캡처 완료, `requirement/card1-public-private-boundary.md` |
| 남의 패스키로 열기 | 계정1 세션으로 계정2의 item id 요청 | [TODO] 각 계정 본인 자료 200 응답 | [TODO] 404 응답 — 절차는 `requirement/card5-verification-and-docs.md` |
| 이미 쓴 challenge 재사용 | 같은 challenge(같은 auth_flow 쿠키)로 login-verify 두 번 전송 | 첫 요청 `401 unknown_credential` (challenge 소모) | 두 번째 요청 `401 login_expired_or_challenge_already_used` — 캡처 완료, `requirement/card3-login-passkey.md` |
| 패스키 삭제 뒤 로그인 | 패스키 하나 삭제 → 그걸로/남은 걸로 로그인 시도 | [TODO] 남은 패스키 로그인 200 | [TODO] 삭제한 패스키 401 — 절차는 `requirement/card4-lost-device.md` |

---

## 짧은 확인 방법 (T08-C52)

① **어디로 가나요**: 배포된 URL을 열고 `Private` 메뉴로 스크롤합니다.
② **세 단계 안에 무엇을 하나요**: (1) "새 패스키 등록"으로 계정을 하나 만들고 (2) 로그아웃한 뒤 (3) "패스키로 로그인" 버튼을 누르거나 계정 입력칸을 클릭해 자동완성으로 로그인합니다.
③ **무엇이 보이면 통과인가요**: 로그인 후 비공개 영역에 항목 3개(제목+본문)와 등록된 패스키 목록이 나타납니다.
④ **안 될 때는 무엇이 보이나요**: 로그인/등록이 취소되거나 실패하면 화면 하단에 빨간색 안내 문구(예: "로그인이 취소되었습니다", "마지막 남은 패스키는 삭제할 수 없습니다")가 나타나고, 비공개 영역은 계속 잠긴 상태(🔒 아이콘)로 남습니다.

---

## AI 협업 (T08-C53)

### ① AI에게 맡긴 일
[TODO: 본인 관점에서 작성 — 예: WebAuthn 라이브러리 API(정확한 함수 시그니처, 옵션 이름)를 조사하고 코드 초안을 작성하는 일을 맡겼습니다]

### ② 내가 직접 판단한 일
[TODO: 예: 어떤 라이브러리/DB/세션 방식을 쓸지, 로그인 UI를 아이디 입력 방식이 아니라 Conditional UI로 할지, 마지막 패스키 삭제를 막을지 등 매 결정을 AI가 옵션과 장단점을 제시하면 직접 하나씩 선택했습니다]

### ③ AI 제안을 따르지 않은 일 (없다면 왜 없었는지)
[TODO: 실제로 있었다면 어떤 지점에서 AI 제안과 다르게 결정했는지 적으세요. 예를 들어 AI는 처음에 "아이디 입력 방식"을 추천했지만, 테스트 편의 외의 실질적 장점이 있는지 되물어본 뒤 근거가 약하다고 판단해 완전 패스워드리스(Conditional UI) 방식으로 바꿨습니다.]

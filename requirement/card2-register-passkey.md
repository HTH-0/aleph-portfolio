# 카드 2 — 패스키를 등록한다: 남길 것

> 원문: 등록 요청과 응답 기록, 서버에 저장된 공개키, 패스키 목록 화면

## 1. 등록 challenge가 요청마다 다르다는 기록 (캡처 완료, T08-C20)

`/api/register-options`를 서로 다른 계정 이름으로 두 번 호출한 결과입니다. `challenge` 값이 매번 다른 것을 확인할 수 있습니다.

```
$ curl -s -X POST https://aleph-portfolio.vercel.app/api/register-options \
    -H "Content-Type: application/json" -d '{"username":"evidence-probe-1"}'

{"options":{"challenge":"7dVNF4nASRfW88GLB-KzGmCTjc9RIt2p6uYAC6vo-8Y", ...}}

$ curl -s -X POST https://aleph-portfolio.vercel.app/api/register-options \
    -H "Content-Type: application/json" -d '{"username":"evidence-probe-2"}'

{"options":{"challenge":"VBoUqL_VhP3FpicwIRmRlK7753rRYcBwR9UECprptfU", ...}}
```

서버는 이 challenge를 응답에 보내는 동시에, 브라우저 쿠키(`reg_flow`, httpOnly)로 발급한 challenge의 참조값만 내려주고, 실제 challenge 문자열은 `challenges` 테이블에 서버가 직접 보관합니다 (T08-C19) — `lib/challenges.js`의 `createChallenge()`.

> 참고: 위 두 요청은 증거 캡처용으로 `curl`만 보낸 것이라 실제 브라우저 등록으로 이어지지 않았고, `users`/`credentials` 테이블에는 아무것도 추가되지 않았습니다 (등록이 끝나지 않으면 서버에 아무것도 저장되지 않는다는 T08-C25와 같은 원리).

## 2. [TODO] 실제 등록 요청/응답 기록 (브라우저에서 캡처 필요)

1. 배포 URL 접속 → 개발자도구(F12) → **Network** 탭 열기
2. "새 패스키 등록"으로 실제 계정을 하나 만듭니다 (예: `test-account-1`)
3. Network 탭에서 `register-options`와 `register-verify` 두 요청을 찾아 각각 **Payload/Request**와 **Response** 탭을 캡처
4. `register-verify` 요청의 Payload를 열어서, `response` 안에 개인키나 서명용 비밀값이 전혀 없고 `attestationObject`/`clientDataJSON`(공개적으로 검증 가능한 값들)만 있다는 걸 확인 — 이게 T08-C23("개인키가 서버로 전송되지 않는다")의 증거입니다.
5. 스크린샷을 `card2-register-request.png`, `card2-register-response.png`로 저장

## 3. [TODO] 서버에 저장된 공개키 (Neon 콘솔에서 캡처 필요)

1. console.neon.tech 접속 → 이 프로젝트용으로 만든 DB 선택 → **Tables** → `credentials` 테이블 열기
2. `public_key` 컬럼 값(바이너리/hex로 보일 것)과 `nickname`, `created_at` 컬럼이 함께 보이는 화면을 캡처
3. 캡처한 화면 옆에 짧은 설명을 붙여주세요: "이 값은 공개키이며 비밀번호가 아닙니다 — 로그인 시 서버가 이 값으로 서명을 검증만 할 뿐, 이 값 자체로는 아무것도 흉내낼 수 없습니다" (T08-C22)
4. `card2-stored-publickey.png`로 저장

## 4. [TODO] 패스키 목록 화면

1. 로그인 상태에서 Private 섹션의 "등록된 패스키" 목록이 보이는 화면 캡처
2. 방금 등록한 패스키의 이름(예: "MacBook Touch ID")과 등록일이 보여야 함 (T08-C24)
3. `card2-passkey-list.png`로 저장

## 5. [TODO] 등록 취소 확인 (T08-C25)

1. "새 패스키 등록" 시작 → 브라우저가 띄우는 패스키 생성 창에서 **취소** 클릭
2. 화면에 "등록이 취소되었습니다. 서버에는 아무것도 저장되지 않았습니다" 안내가 뜨는지 확인하고 캡처
3. `card2-register-cancelled.png`로 저장

## 6. 패스키 저장 위치 (T08-C26)

등록할 때 브라우저가 어떤 저장소를 제안했는지(Windows Hello / 구글 비밀번호 관리자 / 휴대폰 / 보안 키 등) 실제로 선택한 걸 그대로 적어주세요.

[TODO: 실제로 사용한 저장소를 적으세요. 예: "Windows Hello(내 PC의 지문 인식)" 또는 "Google 비밀번호 관리자(안드로이드 휴대폰)"]

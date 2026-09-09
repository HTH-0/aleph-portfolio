# 카드 3 — 패스키로 들어간다: 남길 것

> 원문: 성공한 로그인 요청과 실패한 요청, 이미 쓴 질문을 재사용한 요청과 거절 응답

## 1. 로그인 challenge가 요청마다 다르다는 기록 (캡처 완료, T08-C28)

```
$ curl -s -X POST https://aleph-portfolio.vercel.app/api/login-options
{"options":{"rpId":"aleph-portfolio.vercel.app","challenge":"naFCemuVD15w-KZA5BVcha17_hhhVxmKcKqRwJ0EdMU", ...}}

$ curl -s -X POST https://aleph-portfolio.vercel.app/api/login-options
{"options":{"rpId":"aleph-portfolio.vercel.app","challenge":"3UENpwp6O2xOrBw4MQR0-fXHpQ1MD0tvRRz3cW88F80", ...}}
```

## 2. 실패한 로그인 요청 + 이미 쓴 challenge 재사용 거절 (캡처 완료, T08-C31)

실제 등록된 패스키 없이 challenge 하나를 발급받아, 같은 challenge(같은 `auth_flow` 쿠키 값)로 두 번 로그인을 시도한 기록입니다. 두 요청 모두 신원 검증 자체는 실패하지만(등록된 자격증명이 아니므로), **두 번째 요청에서만** "이미 쓴 challenge"라는 별도의 이유로 거절되는 걸로 재사용 방지 로직이 실제로 동작함을 확인할 수 있습니다.

```
--- 1) challenge 발급 ---
$ curl -s -i -X POST https://aleph-portfolio.vercel.app/api/login-options

HTTP/1.1 200 OK
Set-Cookie: auth_flow=6QREXWWOQwZqMVuiMY0gG8yioci2wXJr; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=300

{"options":{"rpId":"aleph-portfolio.vercel.app","challenge":"YSFWzfbFGaAlhEMKs3AndkS_FgwnZNUFkjg95-x-1DQ", ...}}

--- 2) 그 쿠키로 첫 번째 login-verify 요청 (없는 credential id) ---
$ curl -s -i -X POST https://aleph-portfolio.vercel.app/api/login-verify \
    -H "Content-Type: application/json" \
    -H "Cookie: auth_flow=6QREXWWOQwZqMVuiMY0gG8yioci2wXJr" \
    -d '{"response":{"id":"evidence-nonexistent-credential-id"}}'

HTTP/1.1 401 Unauthorized
{"error":"unknown_credential"}

--- 3) 완전히 같은 쿠키(같은 challenge)로 다시 요청 ---
$ curl -s -i -X POST https://aleph-portfolio.vercel.app/api/login-verify \
    -H "Content-Type: application/json" \
    -H "Cookie: auth_flow=6QREXWWOQwZqMVuiMY0gG8yioci2wXJr" \
    -d '{"response":{"id":"evidence-nonexistent-credential-id"}}'

HTTP/1.1 401 Unauthorized
{"error":"login_expired_or_challenge_already_used"}
```

첫 요청에서 challenge가 소모(삭제)되고, 두 번째 요청은 challenge 자체를 찾지 못해 별도 사유(`login_expired_or_challenge_already_used`)로 거절됩니다 — `api/login-verify.js`의 `consumeChallenge()` 호출 부분(DELETE ... RETURNING 패턴)이 이 동작을 만듭니다.

## 3. [TODO] 실제 성공한 로그인 요청 (브라우저에서 캡처 필요)

실제 등록된 패스키로 로그인해야 하는 부분이라 브라우저가 필요합니다.

1. 개발자도구(F12) → Network 탭 켠 상태에서 실제 계정으로 "패스키로 로그인" 성공
2. `login-options`, `login-verify` 요청/응답 캡처 (`login-verify` 응답이 `{"ok":true}`이고 상태 200인지 확인)
3. `card3-login-success.png`로 저장

## 4. [TODO] 세션 식별 방식 (T08-C32)

이 앱은 **세션**(JWT 토큰 아님)을 씁니다. 로그인 성공 시 서버가 `sessions` 테이블에 행을 하나 만들고, 그 행의 id를 `sid`라는 httpOnly 쿠키로 브라우저에 내려줍니다. 매 요청마다 서버는 그 쿠키 값으로 `sessions` 테이블을 조회해서 로그인 여부를 판단합니다 (`lib/session.js`의 `createSession()` / `getSessionUser()`).

## 5. [TODO] 로그아웃 후 같은 세션 값 재사용 거절 (T08-C33)

1. 로그인 상태에서 Network 탭 → 아무 요청에서나 `Cookie: sid=...` 헤더 값을 복사해둡니다
2. "로그아웃" 클릭
3. 터미널에서 복사해둔 값으로 직접 요청:
   ```
   curl -i https://aleph-portfolio.vercel.app/api/private-items -H "Cookie: sid=<복사한 값>"
   ```
4. 401이 나오는 걸 캡처해서 `card3-logout-rejected.png` 또는 텍스트로 저장

## 6. [TODO] 기록에서 세션 값 가리기 (T08-C34)

위 5번에서 캡처한 스크린샷/텍스트에 실제 `sid` 값이 그대로 보인다면, 제출 전에 값의 가운데 부분을 `sid=6QRE...(가림)...r` 처럼 지우거나 검게 칠해서 올려주세요. 실제 세션 값은 그 자체로 로그인 상태를 가로챌 수 있는 민감한 값이라 그대로 공개하면 안 됩니다.

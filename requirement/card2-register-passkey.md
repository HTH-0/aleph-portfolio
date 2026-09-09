# 카드 2 — 패스키를 등록한다: 남길 것

> 원문: 등록 요청과 응답 기록, 서버에 저장된 공개키, 패스키 목록 화면

아래는 헤드리스 브라우저(Chrome DevTools Protocol의 가상 인증기 기능 사용)로 배포된 사이트에 실제로 접속해서 실제 계정을 만들고 캡처한 결과입니다. 가상 인증기는 진짜 지문/기기가 없어도 스펙에 맞는 진짜 키 쌍과 서명을 만들어내기 때문에, 서버 입장에서는 실제 패스키 등록과 구별되지 않습니다.

## 1. 등록 요청/응답 기록 (T08-C19, T08-C20)

계정 `auto-evidence-1-*`를 실제로 등록한 기록입니다 (전체 로그는 `automated-run-log.json` 참고).

```
POST /api/register-options
→ 200 {"options":{"challenge":"BcAAOuHr4MPVA9H3pyJIDUEqb3O-3aG3EvohNeSaAd8", "rp":{"id":"aleph-portfolio.vercel.app",...}, "user":{"name":"auto-evidence-1-mttu2v3x",...}, ...}}

POST /api/register-verify   (등록 화면 캡처)
→ 200 {"ok":true}
```

![등록 폼](screenshots/card2-register-form.png)

challenge 값이 등록 시도마다 다르다는 건 `card1`/`card3` 파일에 있는 두 번 연속 호출 비교로 이미 확인했습니다 (같은 메커니즘).

## 2. 등록 후 화면 — 비공개 항목 3개 + 패스키 목록

![등록 직후 화면](screenshots/card2-unlocked-after-register.png)

등록이 끝나자마자 세션이 자동으로 생성되고(`api/register-verify.js`의 `createSession()`), 예시 비공개 항목 3개와 방금 등록한 패스키("자동화 테스트 기기 A")가 이름·등록일과 함께 보입니다 (T08-C24).

## 3. [TODO] 서버에 저장된 공개키 — Neon 콘솔 캡처 필요

이건 제가 대신 할 수 없는 유일한 부분입니다. Neon 프로젝트의 로그인 정보를 제가 갖고 있지 않고(의도적으로 공유받지 않았습니다 — 예전에 DB 값이 여러 프로젝트에 공유되어 사고가 났던 경험이 있으셔서, 접속 정보는 계속 본인만 갖고 계시는 게 맞습니다), 앱의 API도 공개키 원문은 일부러 응답에 포함하지 않습니다(불필요하게 노출 안 시키려고 `api/passkeys.js`에서 뺐습니다).

1. console.neon.tech 접속 → 이 프로젝트용 DB → **Tables** → `credentials` 테이블
2. `public_key`, `nickname`, `created_at` 컬럼이 함께 보이는 화면 캡처 (지금까지 자동으로 등록된 `auto-evidence-*` 계정들의 행이 실제로 보일 것입니다)
3. "이 값은 공개키이며 비밀번호가 아닙니다 — 로그인 시 서버가 이 값으로 서명을 검증만 할 뿐, 이 값 자체로는 아무것도 흉내낼 수 없습니다"라는 설명을 붙여서 `screenshots/card2-stored-publickey.png`로 저장

## 4. 등록 취소 시 아무것도 저장되지 않음 (T08-C25)

가상 인증기를 아예 연결하지 않은 상태로 등록을 시도해서(=사용자가 인증 창을 취소한 것과 같은 상황), 그 계정 이름(`evidence-cancel-test`)이 여전히 "미등록" 상태인지 서버에 직접 물어봤습니다.

```
$ curl -s -X POST https://aleph-portfolio.vercel.app/api/register-options \
    -H "Content-Type: application/json" -d '{"username":"evidence-cancel-test"}'

200 {"options":{"challenge":"5u48QkzKkNYEEoWufEtqtRPpzQzd90zmdwL6qECdtwo", "user":{"name":"evidence-cancel-test",...}}}
```

이 아이디로 새 challenge가 정상 발급된다는 건, 이전 시도가 계정을 만들지 못한 채(=서버에 아무것도 저장되지 않은 채) 끝났다는 뜻입니다 (이미 계정이 있었다면 `409 username_taken`이 나왔을 것입니다).

> 참고: 화면에 뜨는 정확한 취소 안내 문구("등록이 취소되었습니다...")까지는 이번 자동화로 재현하지 못했습니다(가상 인증기가 아예 없을 때 브라우저가 그 문구가 뜨기 전에 다른 방식으로 반응했습니다). 화면 문구 자체를 스크린샷으로 남기고 싶으시면, 실제 등록 버튼을 눌렀다가 뜨는 패스키 생성 창에서 **취소**를 눌러보시는 게 가장 정확합니다 — 몇 초면 되는 간단한 확인입니다.

## 5. [TODO] 패스키 저장 위치 (T08-C26)

이건 실제로 어떤 저장소를 선택하셨는지 본인만 아는 정보라 직접 적어주셔야 합니다.

[TODO: 실제 계정을 등록할 때 브라우저가 제안한 저장소를 적으세요. 예: "Windows Hello(내 PC의 지문 인식)" 또는 "Google 비밀번호 관리자"]

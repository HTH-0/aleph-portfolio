# 카드 5 — 정말 안 열리는지 확인하고, 어떻게 붙였는지 적는다: 남길 것

> 원문: 확인 네 가지의 요청과 응답, 인증 구현 설명서 여섯 항목

**인증 구현 설명서 여섯 항목, 짧은 확인 방법, AI 협업 부분은 `SUBMISSION.md`에 있습니다.** 거기 `[TODO]`로 남은 부분(④ 확인 기록, ⑤ AI와 나)을 채울 때 이 폴더의 캡처 결과를 그대로 옮겨 붙이면 됩니다.

이 파일은 카드5 고유의 "계정 두 개 교차 접근" 확인(T08-C36~C41)에 집중합니다. 이건 실제 계정 두 개와 실제 로그인 세션이 필요해서 여기서부터는 직접 진행해주셔야 합니다. 아래 명령어의 `<...>` 부분만 실제 값으로 바꿔서 터미널에 그대로 붙여넣으면 됩니다.

## 준비: 계정 두 개, 세션 값 두 개

1. `test-account-1`, `test-account-2` 두 계정을 이미 만드셨다면 (또는 `card4`에서 만든 계정을 재사용해도 됩니다) 각각 로그인한 상태에서 개발자도구 Network 탭 → 아무 API 요청의 **Cookie** 헤더에서 `sid=...` 값을 복사해두세요.
   - account1의 세션 값 → 아래에서 `<SID_1>`
   - account2의 세션 값 → 아래에서 `<SID_2>`
   - 주의: `sid` 값은 로그인 상태를 가로챌 수 있는 민감한 값입니다. 최종 제출 자료에는 값을 가려서 올리세요 (T08-C34).

## 1. 서로 다른 계정에 서로 다른 비공개 내용 (T08-C36)

```
curl -s https://aleph-portfolio.vercel.app/api/private-items -H "Cookie: sid=<SID_1>"
curl -s https://aleph-portfolio.vercel.app/api/private-items -H "Cookie: sid=<SID_2>"
```
두 응답의 `items` 배열 안 `id` 값들이 서로 겹치지 않는 걸 확인하고, 각각의 응답을 캡처하세요. 그중 account2 응답에서 아무 항목 하나의 `id` 값을 복사해서 아래 `<ITEM_ID_OF_2>`에 사용합니다.

## 2. 한쪽 패스키로 다른 쪽 자료 읽기 시도 → 거절 (T08-C37)

```
curl -s -i https://aleph-portfolio.vercel.app/api/private-items/<ITEM_ID_OF_2> -H "Cookie: sid=<SID_1>"
```
`404 {"error":"not_found"}`가 나와야 합니다. 이 요청과 응답을 그대로 캡처하세요.

## 3. 반대 방향도 동일하게 거절 (T08-C38)

account1의 아무 항목 id를 `<ITEM_ID_OF_1>`으로 써서 반대로:
```
curl -s -i https://aleph-portfolio.vercel.app/api/private-items/<ITEM_ID_OF_1> -H "Cookie: sid=<SID_2>"
```
마찬가지로 404가 나와야 하고, 이 결과도 캡처하세요.

## 4. 거절 앞뒤로 상대방 자료 건수가 그대로인지 (T08-C39)

```
curl -s https://aleph-portfolio.vercel.app/api/private-items -H "Cookie: sid=<SID_2>"
```
2번 요청(거절된 시도) **전**과 **후**에 이 명령을 각각 한 번씩 실행해서, `items` 배열 길이가 그대로인지 비교해 두 결과를 나란히 캡처하세요.

## 5. 요청에 다른 계정을 적어 보내도 내 자료만 돌아오는지 (T08-C40)

```
curl -s https://aleph-portfolio.vercel.app/api/private-items?userId=<ACCOUNT_2_USER_ID> -H "Cookie: sid=<SID_1>"
```
`userId` 쿼리로 account2를 지목해도, 응답엔 여전히 account1 자신의 항목만 담겨 있어야 합니다. (account2의 user id를 모르면 아무 문자열이나 넣어도 결과는 같습니다 — 서버가 애초에 이 파라미터를 읽지 않기 때문입니다.)

## 6. 이 거절을 만드는 소스 위치 (T08-C41)

- `api/private-items.js` 상단 주석과 쿼리: `WHERE user_id = ${user.id}` — `user`는 세션 쿠키로만 결정됩니다 (`lib/session.js`의 `getSessionUser()`), 요청의 쿼리/바디에 있는 어떤 값도 신원 판단에 쓰이지 않습니다.
- `api/private-items/[id].js`의 `WHERE id = ${id} AND user_id = ${user.id}` — 항목 id가 존재하더라도 소유자가 다르면 그냥 0건으로 취급되어 404가 됩니다.

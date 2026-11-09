# hrum-saju-example

흐름(HRUM) 만세력 API로 사주 원국을 받아 보는 아주 작은 예제예요. 설치할 패키지가 없어요. Node에 들어 있는 `http`·`crypto`·`fetch`만 써요.

- `first-call.mjs` — 터미널에서 만세력을 한 번 불러 네 기둥을 출력해요
- `server.mjs` + `public/index.html` — 생년월일을 넣으면 네 기둥과 오행·용신·지금 대운을 보여 주는 작은 웹 페이지예요. API 키는 서버에만 있고, 브라우저는 이 서버의 `/api/manseryeok`만 불러요

## 준비

- Node (`--env-file` 옵션을 쓰므로 Node 20.6 이상)
- 흐름 콘솔에서 발급한 API 키 — [콘솔 로그인](https://console.hrum.ai/login.html)에서 가입하고 [API 키](https://console.hrum.ai/apikeys.html) 화면에서 발급해요. 새 키는 발급 직후 한 번만 보이니 바로 복사해 두세요

## 실행

```bash
cp .env.example .env
# .env 를 열어 HRUM_API_KEY= 뒤에 키를 붙여 넣기

npm run first-call   # 터미널에 네 기둥 출력
npm start            # http://localhost:3000 열기
```

`npm` 없이 `node --env-file=.env server.mjs`로 실행해도 같아요.

## 이 예제가 지키는 것

- **키는 서버에만.** `.env`는 `.gitignore`에 들어 있어요. 브라우저 코드에 키를 넣지 않아요
- **브라우저가 보낸 본문을 그대로 넘기지 않아요.** 서버가 정해진 필드만 골라 검사한 뒤 새로 만들어 보내요
- **태어난 시간을 모르면 `hour`·`minute`를 아예 빼고 보내요.** 정오 같은 값을 대신 채우지 않아요. 이때 응답의 `wonkuk.hour`는 `null`이고 `birthHour.known`이 `false`예요
- **같은 입력은 다시 부르지 않아요.** 만세력은 같은 입력이면 결과가 같아서, 요청 본문 해시를 키로 결과를 저장해 다시 써요. 이 예제는 메모리에 저장하니 실제 서비스에서는 DB에 저장하세요
- **오류는 `statusCode`로 나눠요.** `message` 문구에는 기대지 않아요
- **화면에는 `textContent`로만 그려요.** API 문자열을 HTML로 해석하지 않아요

## 콘솔에서 해 두면 좋은 것

콘솔 API 키 화면의 **요청 제한**에서 초당·일일 요청 수를 정해 두세요. 키가 새거나 코드가 반복 호출에 빠져도 잔액을 지킬 수 있어요.

## 참고 문서

- [개발자 시작 가이드](https://hrum.ai/getting-started.html)
- [API 가이드 — 만세력 API](https://hrum.ai/docs.html#saju-api)

## 라이선스

MIT — [LICENSE](./LICENSE)

이 예제는 흐름을 만드는 플로트(FLOAT Co., Ltd.)가 만들었어요.

# guestbook-202204202 — 미니 방명록

- 개발자: 김태하 (학번 202204202)
- 배포: https://guestbook-202204202.vercel.app
- 스택: Next.js 16 (App Router) + TypeScript + Neon Postgres + Vercel + Tailwind CSS

회원가입 없이 이름·메시지·글 비밀번호로 글을 남긴다. 글 비밀번호로 내 글만 수정·삭제할 수 있다. 같은 글에 글 비밀번호를 5회 틀리면 그 요청자(IP)는 20분간 잠긴다.

## SDD 진행 기록 (Matt Pocock's Skills)

| 단계 | 결과물 |
|---|---|
| `/setup-matt-pocock-skills` | `docs/agents/` (local markdown 이슈 트래커) |
| `/grill-with-docs` | `CONTEXT.md` (용어집), `docs/adr/0001-*.md` |
| `/to-spec` | `.scratch/guestbook/spec.md` |
| `/to-tickets` | `.scratch/guestbook/issues/01~04` |
| `/implement` (+ `/tdd`) | `src/`, `tests/` |
| `/code-review` | 리뷰 지적 사항 반영 (spec의 Review Follow-ups) |

## 실행

```bash
cp .env.example .env.local   # DATABASE_URL에 Neon 연결 문자열 입력
npm install
npm run dev                  # http://localhost:3000
```

테이블은 첫 요청 때 자동 생성된다.

## 테스트 (HTTP API)

```bash
npm run dev:test             # 테스트용 개발 서버 (3123 포트)
npm test                     # 다른 터미널에서 실행
API_BASE_URL=https://guestbook-202204202.vercel.app npm test   # 배포 환경 확인 (요청자 흉내 테스트는 건너뜀)
```

## API

| Method | Path | Body | 응답 |
|---|---|---|---|
| GET | `/api/entries` | - | 200 글 목록 (최신순) |
| POST | `/api/entries` | `name, message, password` | 201 / 400 |
| PATCH | `/api/entries/:id` | `message, password` | 200 / 400 / 403 `remainingAttempts` / 404 / 429 `retryAfterMinutes` |
| DELETE | `/api/entries/:id` | `password` | 200 / 400 / 403 / 404 / 429 |

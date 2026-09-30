# 📖 미니 방명록 (guestbook-202204202)

회원가입 없이 누구나 한 마디를 남기고, **글마다 정한 비밀번호**로 내 글만 고치거나 지울 수 있는 미니 방명록입니다.

- **배포 주소:** https://guestbook-202204202.vercel.app
- **개발자:** 김태하 (학번 202204202)
- **개발 방식:** SDD (Spec-Driven Development) + Claude Code + Matt Pocock's Skills

---

## ✨ 주요 기능

### 글 작성 (Create)
- 작성자 이름, 메시지, 글 비밀번호를 입력해 누구나 글을 남길 수 있습니다.
- 입력 규칙: 이름 1~30자, 메시지 1~500자, 글 비밀번호 4~50자. 앞뒤 공백은 정리되고, 공백만 입력하면 거부됩니다.
- 입력이 잘못되면 폼 아래에 이유를 안내합니다. 등록에 성공하면 토스트 알림이 뜹니다.

### 글 조회 (Read)
- 모든 글을 **작성 시각 최신순**으로 한 페이지에 보여 줍니다.
- 각 글에는 작성자 이름 첫 글자 아바타(이름마다 고정 색상), 메시지, 작성 시각이 표시됩니다.
- 작성 시각은 "3분 전"처럼 상대 시간으로 보이고, 마우스를 올리면 정확한 한국 시간을 보여 줍니다.

### 글 수정 (Update)
- 작성할 때 정한 글 비밀번호를 입력하면 **메시지**를 수정할 수 있습니다. 이름과 작성 시각은 바뀌지 않습니다.
- 수정된 글에는 "(수정됨)"이 표시되고, 목록에서 위치는 그대로 유지됩니다.
- 글 비밀번호가 틀리면 수정이 거부되고, 해당 글 아래에 **"글 비밀번호가 일치하지 않습니다. (남은 시도 N회)"**가 표시됩니다.

### 글 삭제 (Delete)
- 글 비밀번호를 입력하면 글이 **완전히 삭제**됩니다.
- 글 비밀번호가 틀리면 삭제가 거부되고 같은 방식으로 안내됩니다.

### 🔒 비밀번호 무차별 대입 방지 (잠금)
- 한 요청자(IP)가 한 글에 글 비밀번호를 **5회 틀리면 20분간** 그 글을 수정·삭제할 수 없습니다.
- 수정 실패와 삭제 실패는 합쳐서 셉니다. 맞는 글 비밀번호로 성공하면 횟수가 초기화됩니다.
- 잠긴 동안에는 맞는 글 비밀번호를 넣어도 거부되고, "약 N분 후 다시 시도하세요"라고 안내합니다.
- 잠금은 **글 + 요청자** 단위입니다. 누군가 내 글에 일부러 5번 틀려도 나는 계속 내 글을 관리할 수 있습니다. 설계 이유는 [ADR-0001](docs/adr/0001-lockout-per-entry-and-requester.md)에 있습니다.
- 틀린 요청을 동시에 여러 개 보내도 잠금이 풀리지 않도록 처리했고, 테스트로 검증합니다.

---

## 🛠 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router), React 19 |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS 4 |
| 데이터베이스 | Neon Postgres (`@neondatabase/serverless`) |
| 비밀번호 해시 | bcryptjs |
| 테스트 | Vitest (HTTP API 테스트) |
| 배포 | Vercel (GitHub `main` 브랜치에 push하면 자동 배포) |
| 개발 도구 | Claude Code + Matt Pocock's Skills |

---

## ⚙️ 동작 방식

- **로그인 없는 권한 확인:** 글을 쓸 때 입력한 비밀번호를 bcrypt 해시로만 저장합니다. 수정·삭제할 때 입력값을 해시와 비교합니다. 원래 비밀번호는 어디에도 저장되거나 응답에 노출되지 않습니다.
- **비밀번호 확인 순서 (수정·삭제 공통):**
  1. 글이 있는지 확인합니다.
  2. 잠겨 있는지 확인합니다.
  3. 해시를 비교합니다.
  4. 틀리면 실패를 기록하고, 맞으면 기록을 초기화한 뒤 작업을 수행합니다.
- **잠금 저장:** 서버리스 환경이라 메모리에 저장하면 요청마다 사라집니다. 그래서 실패 시도를 DB에 저장하고, 한 번의 upsert로 원자적으로 기록합니다.
- **요청자 식별:** Vercel이 실제 클라이언트 IP로 설정하는 `x-forwarded-for`의 첫 값을 씁니다. 클라이언트가 이 헤더를 위조해도 Vercel이 덮어씁니다.
- **테이블 자동 생성:** 첫 요청 때 필요한 테이블을 자동으로 만들기 때문에 별도의 마이그레이션이 필요 없습니다.

### 데이터 모델

```
entries                          failed_attempts
─────────────────────────        ─────────────────────────────────
id            SERIAL PK          entry_id      FK → entries.id (ON DELETE CASCADE)
name          TEXT               requester     TEXT (IP)
message       TEXT               count         INTEGER
password_hash TEXT (bcrypt)      locked_until  TIMESTAMPTZ
created_at    TIMESTAMPTZ        PK (entry_id, requester)
updated_at    TIMESTAMPTZ
```

---

## 📁 프로젝트 구조

```
├── src/
│   ├── app/
│   │   ├── page.tsx                  # 헤더 (제목, 개발자 이름·학번 배지)
│   │   ├── Guestbook.tsx             # 작성 폼, 글 목록, 수정·삭제, 토스트
│   │   └── api/entries/
│   │       ├── route.ts              # GET 목록, POST 작성
│   │       └── [id]/route.ts         # PATCH 수정, DELETE 삭제 (글 비밀번호 확인)
│   └── lib/
│       ├── db.ts                     # Neon 연결, 테이블 자동 생성
│       ├── lockout.ts                # 실패 시도 기록, 잠금 판정
│       └── developer.ts              # 개발자 이름·학번
├── tests/                            # HTTP API 테스트 (Vitest)
├── CONTEXT.md                        # 도메인 용어집
├── docs/adr/                         # 설계 결정 기록 (ADR)
├── docs/agents/                      # Matt Pocock's Skills 설정
└── .scratch/guestbook/               # 스펙과 티켓 (local markdown 이슈 트래커)
```

---

## 🔌 API

| Method | Path | Body | 응답 |
|---|---|---|---|
| GET | `/api/entries` | - | `200` 글 목록 (최신순) |
| POST | `/api/entries` | `name`, `message`, `password` | `201` 생성된 글 / `400` 입력 오류 |
| PATCH | `/api/entries/:id` | `message`, `password` | `200` 수정된 글 / `400` / `403` 글 비밀번호 불일치 + `remainingAttempts` / `404` / `429` 잠김 + `retryAfterMinutes` |
| DELETE | `/api/entries/:id` | `password` | `200` / `400` / `403` / `404` / `429` |

모든 오류 응답의 `error`는 화면에 바로 보여 줄 수 있는 한국어 문장입니다.

---

## 🚀 로컬 실행

```bash
cp .env.example .env.local   # DATABASE_URL에 Neon 연결 문자열 입력
npm install
npm run dev                  # http://localhost:3000
```

## 🧪 테스트

HTTP API에 실제 요청을 보내 동작을 검증합니다. 작성, 조회, 수정, 삭제, 입력 검증, 남은 시도, 잠금, 동시 요청을 다루는 테스트 24개가 있습니다.

```bash
npm run dev:test             # 테스트용 개발 서버 (3123 포트)
npm test                     # 다른 터미널에서 실행

# 배포 환경 확인 (요청자를 흉내 내는 테스트는 자동으로 건너뜀)
API_BASE_URL=https://guestbook-202204202.vercel.app npm test
```

---

## 📝 SDD 진행 기록

Matt Pocock's Skills로 명세 → 티켓 → 구현 → 리뷰 순서로 진행했습니다.

| 단계 | 한 일 | 결과물 |
|---|---|---|
| `/setup-matt-pocock-skills` | 이슈 트래커(local markdown), 라벨, 문서 구조 설정 | [docs/agents/](docs/agents/) |
| `/grill-with-docs` | 질문과 답으로 요구사항과 용어를 확정. 잠금 정책과 UI 방향 결정 | [CONTEXT.md](CONTEXT.md), [ADR-0001](docs/adr/0001-lockout-per-entry-and-requester.md) |
| `/to-spec` | 사용자 스토리 42개, 구현·테스트 결정, 범위 밖 항목 정리 | [spec.md](.scratch/guestbook/spec.md) |
| `/to-tickets` | 수직 슬라이스 티켓 4개로 분해 | [issues/](.scratch/guestbook/issues/) |
| `/implement` + `/tdd` | 티켓 01~04를 테스트 먼저 작성(red → green)하며 구현 | [src/](src/), [tests/](tests/) |
| `/code-review` | Standards와 Spec 두 축으로 리뷰. 동시 요청 시 잠금이 풀리는 버그 등을 발견하고 수정 | spec의 *Review Follow-ups* |

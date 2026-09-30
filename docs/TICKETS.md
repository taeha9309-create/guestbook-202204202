# TICKETS

- [x] T1. DB 연결 모듈 + 테이블 자동 생성 (`src/lib/db.ts`)
- [x] T2. GET/POST `/api/entries` — 목록 조회(최신순), 글 작성(입력 검증, bcrypt 해시)
- [x] T3. PATCH `/api/entries/:id` — 비밀번호 검증 후 메시지 수정, 불일치 시 403
- [x] T4. DELETE `/api/entries/:id` — 비밀번호 검증 후 삭제, 불일치 시 403
- [x] T5. UI — 작성 폼, 목록, 수정/삭제(비밀번호 입력), 오류 안내, 개발자 이름·학번 표시
- [x] T6. 배포 — GitHub(public) + Vercel + Neon (`DATABASE_URL`)

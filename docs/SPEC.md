# SPEC: 미니 방명록 (Guestbook)

## 목표
회원가입 없이 이름·메시지·비밀번호로 글을 남기고, 비밀번호로 본인 글만 수정·삭제하는 방명록.

## 데이터 모델 (Neon Postgres)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | serial PK | |
| name | text (1~30자) | 작성자 이름 |
| message | text (1~500자) | 메시지 |
| password_hash | text | bcrypt 해시 (평문 저장 금지) |
| created_at | timestamptz default now() | 작성 시각 |
| updated_at | timestamptz null | 수정 시각 |

## API
| Method | Path | Body | 성공 | 실패 |
|---|---|---|---|---|
| GET | /api/entries | - | 200 목록(created_at DESC, 해시 제외) | |
| POST | /api/entries | name, message, password | 201 생성된 글 | 400 입력 오류 |
| PATCH | /api/entries/:id | message, password | 200 수정된 글 | 400 / 403 비밀번호 불일치 / 404 |
| DELETE | /api/entries/:id | password | 200 | 400 / 403 비밀번호 불일치 / 404 |

## 규칙
- 비밀번호 4~50자, bcrypt 해시 비교로 검증 (서버에서만).
- 응답에 password_hash는 절대 포함하지 않는다.
- 비밀번호 불일치 시 UI에 "비밀번호가 일치하지 않습니다." 안내.
- 목록은 최신 작성 순.
- UI 상단/하단에 개발자 이름과 학번 표시.

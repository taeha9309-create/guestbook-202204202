import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureTable, getSql, validText } from "@/lib/db";
import { clearFailures, LOCK_MINUTES, lockedMinutes, MAX_ATTEMPTS, recordFailure, requesterOf } from "@/lib/lockout";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });

function locked(error: string, retryAfterMinutes: number) {
  return NextResponse.json({ error, retryAfterMinutes }, { status: 429 });
}

const stillLocked = (minutes: number) =>
  locked(`글 비밀번호를 ${MAX_ATTEMPTS}회 틀려 잠겼습니다. 약 ${minutes}분 후 다시 시도하세요.`, minutes);

/**
 * 수정·삭제 공통 글 비밀번호 확인. 순서: 글 존재 → 잠금 → 해시 비교 → 실패 기록 또는 초기화.
 * 성공하면 글 번호를, 실패하면 돌려줄 응답을 준다.
 */
async function verify(req: Request, idParam: string, password: unknown) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return { res: NextResponse.json({ error: "잘못된 글 번호입니다." }, { status: 400 }) };
  if (typeof password !== "string" || password.length === 0)
    return { res: NextResponse.json({ error: "글 비밀번호를 입력하세요." }, { status: 400 }) };

  await ensureTable();
  const sql = getSql();
  const requester = requesterOf(req);
  const rows = await sql`SELECT password_hash FROM entries WHERE id = ${id}`;
  if (rows.length === 0) return { res: notFound() };

  // 잠긴 동안에는 해시 비교 없이 거부한다.
  const minutes = await lockedMinutes(id, requester);
  if (minutes !== null) return { res: stillLocked(minutes) };

  if (await bcrypt.compare(password, rows[0].password_hash as string)) {
    await clearFailures(id, requester);
    return { id };
  }

  const outcome = await recordFailure(id, requester);
  switch (outcome.kind) {
    case "entryGone":
      return { res: notFound() };
    case "justLocked":
      return {
        res: locked(`글 비밀번호가 일치하지 않습니다. ${MAX_ATTEMPTS}회 틀려 ${LOCK_MINUTES}분간 잠겼습니다.`, LOCK_MINUTES),
      };
    case "stillLocked":
      return { res: stillLocked(outcome.minutes) };
    case "remaining":
      return {
        res: NextResponse.json(
          {
            error: `글 비밀번호가 일치하지 않습니다. (남은 시도 ${outcome.remainingAttempts}회)`,
            remainingAttempts: outcome.remainingAttempts,
          },
          { status: 403 },
        ),
      };
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const body = await req.json().catch(() => null);
  const { message, password } = body ?? {};
  const v = await verify(req, (await params).id, password);
  if ("res" in v) return v.res;
  if (!validText(message, 1, 500)) return NextResponse.json({ error: "메시지는 1~500자로 입력하세요." }, { status: 400 });
  const rows = await getSql()`
    UPDATE entries SET message = ${message.trim()}, updated_at = now()
    WHERE id = ${v.id}
    RETURNING id, name, message, created_at, updated_at`;
  if (rows.length === 0) return notFound();
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const body = await req.json().catch(() => null);
  const v = await verify(req, (await params).id, body?.password);
  if ("res" in v) return v.res;
  const rows = await getSql()`DELETE FROM entries WHERE id = ${v.id} RETURNING id`;
  if (rows.length === 0) return notFound();
  return NextResponse.json({ ok: true });
}

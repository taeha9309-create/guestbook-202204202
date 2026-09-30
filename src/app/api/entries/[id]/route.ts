import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureTable, getSql, requesterOf, validText } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

const MAX_ATTEMPTS = 5;

async function verify(req: Request, idParam: string, password: unknown) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return { res: NextResponse.json({ error: "잘못된 글 번호입니다." }, { status: 400 }) };
  if (typeof password !== "string" || password.length === 0)
    return { res: NextResponse.json({ error: "비밀번호를 입력하세요." }, { status: 400 }) };

  await ensureTable();
  const sql = getSql();
  const requester = requesterOf(req);
  const rows = await sql`SELECT password_hash FROM entries WHERE id = ${id}`;
  if (rows.length === 0) return { res: NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 }) };

  const ok = await bcrypt.compare(password, rows[0].password_hash as string);
  if (!ok) {
    // 수정·삭제 실패를 합산해 한 번의 upsert로 센다.
    const [a] = await sql`
      INSERT INTO failed_attempts (entry_id, requester, count)
      VALUES (${id}, ${requester}, 1)
      ON CONFLICT (entry_id, requester) DO UPDATE SET count = failed_attempts.count + 1
      RETURNING count`;
    const remainingAttempts = Math.max(0, MAX_ATTEMPTS - (a.count as number));
    return {
      res: NextResponse.json(
        { error: `비밀번호가 일치하지 않습니다. (남은 시도 ${remainingAttempts}회)`, remainingAttempts },
        { status: 403 },
      ),
    };
  }
  await sql`DELETE FROM failed_attempts WHERE entry_id = ${id} AND requester = ${requester}`;
  return { id, sql };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const body = await req.json().catch(() => null);
  const { message, password } = body ?? {};
  if (!validText(message, 1, 500)) return NextResponse.json({ error: "메시지는 1~500자로 입력하세요." }, { status: 400 });
  const v = await verify(req, (await params).id, password);
  if ("res" in v) return v.res;
  const rows = await v.sql`
    UPDATE entries SET message = ${message.trim()}, updated_at = now()
    WHERE id = ${v.id}
    RETURNING id, name, message, created_at, updated_at`;
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const body = await req.json().catch(() => null);
  const v = await verify(req, (await params).id, body?.password);
  if ("res" in v) return v.res;
  await v.sql`DELETE FROM entries WHERE id = ${v.id}`;
  return NextResponse.json({ ok: true });
}

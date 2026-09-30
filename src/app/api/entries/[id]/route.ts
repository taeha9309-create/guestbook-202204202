import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureTable, getSql, validText } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

async function verify(idParam: string, password: unknown) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return { res: NextResponse.json({ error: "잘못된 글 번호입니다." }, { status: 400 }) };
  if (typeof password !== "string" || password.length === 0)
    return { res: NextResponse.json({ error: "비밀번호를 입력하세요." }, { status: 400 }) };

  await ensureTable();
  const sql = getSql();
  const rows = await sql`SELECT password_hash FROM entries WHERE id = ${id}`;
  if (rows.length === 0) return { res: NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 }) };
  const ok = await bcrypt.compare(password, rows[0].password_hash as string);
  if (!ok) return { res: NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 403 }) };
  return { id, sql };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const body = await req.json().catch(() => null);
  const { message, password } = body ?? {};
  if (!validText(message, 1, 500)) return NextResponse.json({ error: "메시지는 1~500자로 입력하세요." }, { status: 400 });
  const v = await verify((await params).id, password);
  if ("res" in v) return v.res;
  const rows = await v.sql`
    UPDATE entries SET message = ${message.trim()}, updated_at = now()
    WHERE id = ${v.id}
    RETURNING id, name, message, created_at, updated_at`;
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const body = await req.json().catch(() => null);
  const v = await verify((await params).id, body?.password);
  if ("res" in v) return v.res;
  await v.sql`DELETE FROM entries WHERE id = ${v.id}`;
  return NextResponse.json({ ok: true });
}

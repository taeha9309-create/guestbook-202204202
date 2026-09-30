import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureTable, getSql, validText } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureTable();
  const sql = getSql();
  const rows = await sql`
    SELECT id, name, message, created_at, updated_at
    FROM entries ORDER BY created_at DESC, id DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { name, message, password } = body ?? {};
  if (!validText(name, 1, 30)) return NextResponse.json({ error: "이름은 1~30자로 입력하세요." }, { status: 400 });
  if (!validText(message, 1, 500)) return NextResponse.json({ error: "메시지는 1~500자로 입력하세요." }, { status: 400 });
  if (typeof password !== "string" || password.length < 4 || password.length > 50)
    return NextResponse.json({ error: "비밀번호는 4~50자로 입력하세요." }, { status: 400 });

  await ensureTable();
  const sql = getSql();
  const hash = await bcrypt.hash(password, 10);
  const rows = await sql`
    INSERT INTO entries (name, message, password_hash)
    VALUES (${name.trim()}, ${message.trim()}, ${hash})
    RETURNING id, name, message, created_at, updated_at`;
  return NextResponse.json(rows[0], { status: 201 });
}

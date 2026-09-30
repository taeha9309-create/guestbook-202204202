import { neon } from "@neondatabase/serverless";

export type Entry = {
  id: number;
  name: string;
  message: string;
  created_at: string;
  updated_at: string | null;
};

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

let schemaReady: Promise<unknown> | null = null;

export function ensureTable() {
  if (!schemaReady) {
    const sql = getSql();
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS entries (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          message TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ
        )`;
      // 실패 시도: (글, 요청자) 단위. 글이 삭제되면 함께 사라진다.
      await sql`
        CREATE TABLE IF NOT EXISTS failed_attempts (
          entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
          requester TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          locked_until TIMESTAMPTZ,
          PRIMARY KEY (entry_id, requester)
        )`;
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

export function validText(v: unknown, min: number, max: number): v is string {
  return typeof v === "string" && v.trim().length >= min && v.trim().length <= max;
}

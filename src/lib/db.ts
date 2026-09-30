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

let ready: Promise<unknown> | null = null;

export function ensureTable() {
  if (!ready) {
    const sql = getSql();
    ready = sql`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ
      )`.catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export function validText(v: unknown, min: number, max: number): v is string {
  return typeof v === "string" && v.trim().length >= min && v.trim().length <= max;
}

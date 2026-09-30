// HTTP API 테스트용 클라이언트. 대상 주소는 API_BASE_URL (기본: 로컬 개발 서버).
export const BASE = process.env.API_BASE_URL ?? "http://localhost:3123";

/**
 * 요청자는 x-forwarded-for로 흉내 낸다. Vercel은 이 헤더를 실제 클라이언트 IP로 덮어쓰므로
 * 배포 환경에서는 요청자를 흉내 낼 수 없다(= 위조 불가). 요청자에 의존하는 테스트는 로컬에서만 돈다.
 */
export const canSimulateRequesters = /localhost|127\.0\.0\.1/.test(BASE);

type Json = Record<string, unknown>;

let seq = 0;
/** 테스트마다 서로 다른 요청자(IP)를 흉내 낸다. */
export function newRequester() {
  seq += 1;
  return `10.${Math.floor(Math.random() * 250)}.${Date.now() % 250}.${seq % 250}`;
}

async function call(method: string, path: string, body?: Json, requester?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requester) headers["x-forwarded-for"] = requester;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

export const api = {
  list: () => call("GET", "/api/entries"),
  create: (body: Json) => call("POST", "/api/entries", body),
  edit: (id: number, body: Json, requester?: string) => call("PATCH", `/api/entries/${id}`, body, requester),
  remove: (id: number, body: Json, requester?: string) => call("DELETE", `/api/entries/${id}`, body, requester),
};

const created: { id: number; password: string }[] = [];

/** 글을 하나 남기고, 테스트 종료 시 지울 수 있게 기억해 둔다. */
export async function createEntry(overrides: Json = {}) {
  const password = (overrides.password as string) ?? "pw1234";
  const body = { name: "테스트", message: `test-${Date.now()}`, password, ...overrides };
  const res = await api.create(body);
  if (res.status !== 201) throw new Error(`create failed: ${res.status} ${JSON.stringify(res.data)}`);
  created.push({ id: res.data.id, password });
  return res.data as { id: number; name: string; message: string; created_at: string; updated_at: string | null };
}

/** 테스트가 만든 글을 모두 지운다. 이미 지워진 글은 무시한다. */
export async function cleanup() {
  while (created.length) {
    const e = created.pop()!;
    await api.remove(e.id, { password: e.password }, newRequester());
  }
}

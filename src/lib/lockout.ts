import { getSql } from "@/lib/db";

// 잠금: 한 요청자가 한 글에 실패 시도를 5회 하면 그 글을 20분간 수정·삭제할 수 없다. (CONTEXT.md, ADR-0001)
export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 20;

/** 요청자: 접속한 IP로 구분한다. Vercel이 실제 클라이언트 IP로 설정하는 x-forwarded-for의 첫 값을 쓴다. */
export type Requester = string & { readonly __brand: "Requester" };

/** IP를 알 수 없는 요청자는 모두 하나의 "unknown" 요청자로 묶여 잠금을 함께 받는다. */
const UNKNOWN_REQUESTER = "unknown";

export function requesterOf(req: Request): Requester {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || req.headers.get("x-real-ip")?.trim() || UNKNOWN_REQUESTER) as Requester;
}

/** 잠겨 있으면 남은 분(최소 1)을, 아니면 null을 돌려준다. */
export async function lockedMinutes(entryId: number, requester: Requester): Promise<number | null> {
  const sql = getSql();
  const [lock] = await sql`
    SELECT CEIL(EXTRACT(EPOCH FROM (locked_until - now())) / 60)::int AS minutes
    FROM failed_attempts
    WHERE entry_id = ${entryId} AND requester = ${requester} AND locked_until > now()`;
  return lock ? Math.max(1, lock.minutes as number) : null;
}

export type FailureOutcome =
  | { kind: "remaining"; remainingAttempts: number }
  | { kind: "justLocked" }
  | { kind: "stillLocked"; minutes: number }
  | { kind: "entryGone" };

/**
 * 실패 시도 1회를 한 문장(upsert)으로 기록한다. 수정·삭제 실패는 같은 키로 합산된다.
 * - 아직 유효한 잠금은 그대로 둔다. 동시에 들어온 요청이 잠금을 풀지 못하게 하기 위해서다.
 * - 만료된 잠금은 1부터 다시 센다.
 * - 5회째에 잠금을 건다.
 */
export async function recordFailure(entryId: number, requester: Requester): Promise<FailureOutcome> {
  const sql = getSql();
  try {
    const [attempt] = await sql`
      INSERT INTO failed_attempts (entry_id, requester, count)
      VALUES (${entryId}, ${requester}, 1)
      ON CONFLICT (entry_id, requester) DO UPDATE SET
        count = CASE
          WHEN failed_attempts.locked_until > now() THEN failed_attempts.count
          WHEN failed_attempts.locked_until IS NOT NULL THEN 1
          ELSE failed_attempts.count + 1 END,
        locked_until = CASE
          WHEN failed_attempts.locked_until > now() THEN failed_attempts.locked_until
          WHEN failed_attempts.locked_until IS NULL AND failed_attempts.count + 1 >= ${MAX_ATTEMPTS}
            THEN now() + make_interval(mins => ${LOCK_MINUTES})
          ELSE NULL END
      RETURNING
        count,
        locked_until = now() + make_interval(mins => ${LOCK_MINUTES}) AS just_locked,
        CEIL(EXTRACT(EPOCH FROM (locked_until - now())) / 60)::int AS minutes`;
    if (attempt.just_locked) return { kind: "justLocked" };
    if (attempt.minutes !== null) return { kind: "stillLocked", minutes: Math.max(1, attempt.minutes as number) };
    return { kind: "remaining", remainingAttempts: Math.max(0, MAX_ATTEMPTS - (attempt.count as number)) };
  } catch (e) {
    // 확인과 기록 사이에 글이 삭제되면 외래 키 위반이 난다.
    if ((e as { code?: string }).code === "23503") return { kind: "entryGone" };
    throw e;
  }
}

/** 맞는 글 비밀번호로 성공하면 그 요청자의 실패 시도를 지운다. */
export async function clearFailures(entryId: number, requester: Requester) {
  const sql = getSql();
  await sql`DELETE FROM failed_attempts WHERE entry_id = ${entryId} AND requester = ${requester}`;
}

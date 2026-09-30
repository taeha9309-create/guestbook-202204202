import { afterAll, describe, expect, it } from "vitest";
import { api, canSimulateRequesters, cleanup, createEntry, newRequester } from "./client";

afterAll(cleanup);

async function failTimes(id: number, requester: string, n: number) {
  let last;
  for (let i = 0; i < n; i++) last = await api.edit(id, { message: "x", password: "wrong!" }, requester);
  return last!;
}

describe.skipIf(!canSimulateRequesters)("잠금", () => {
  it("5번째 실패 순간 20분간 잠긴다", async () => {
    const entry = await createEntry();
    const res = await failTimes(entry.id, newRequester(), 5);
    expect(res.status).toBe(429);
    expect(res.data.retryAfterMinutes).toBe(20);
    expect(res.data.error).toBe("비밀번호가 일치하지 않습니다. 5회 틀려 20분간 잠겼습니다.");
  });

  it("잠긴 동안에는 맞는 글 비밀번호로도 수정·삭제할 수 없다", async () => {
    const entry = await createEntry();
    const me = newRequester();
    await failTimes(entry.id, me, 5);
    const edit = await api.edit(entry.id, { message: "ok", password: "pw1234" }, me);
    expect(edit.status).toBe(429);
    expect(edit.data.error).toMatch(/^비밀번호를 5회 틀려 잠겼습니다\. 약 \d+분 후 다시 시도하세요\.$/);
    expect(edit.data.retryAfterMinutes).toBeGreaterThanOrEqual(19);
    expect(edit.data.retryAfterMinutes).toBeLessThanOrEqual(20);
    expect((await api.remove(entry.id, { password: "pw1234" }, me)).status).toBe(429);
    const list = await api.list();
    expect(list.data.find((e: { id: number }) => e.id === entry.id).message).toBe(entry.message);
  });

  it("같은 글이라도 다른 요청자는 잠기지 않는다", async () => {
    const entry = await createEntry();
    await failTimes(entry.id, newRequester(), 5);
    const res = await api.edit(entry.id, { message: "글쓴이 수정", password: "pw1234" }, newRequester());
    expect(res.status).toBe(200);
  });

  it("같은 요청자라도 다른 글은 잠기지 않는다", async () => {
    const locked = await createEntry();
    const other = await createEntry();
    const me = newRequester();
    await failTimes(locked.id, me, 5);
    const res = await api.edit(other.id, { message: "다른 글", password: "pw1234" }, me);
    expect(res.status).toBe(200);
  });
});

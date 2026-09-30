import { afterAll, describe, expect, it } from "vitest";
import { api, canSimulateRequesters, cleanup, createEntry, failTimes, newRequester, PASSWORD, WRONG_PASSWORD } from "./client";

afterAll(cleanup);

describe.skipIf(!canSimulateRequesters)("잠금", () => {
  it("5번째 실패 순간 20분간 잠긴다", async () => {
    const entry = await createEntry();
    const res = await failTimes(entry.id, newRequester(), 5);
    expect(res.status).toBe(429);
    expect(res.data.retryAfterMinutes).toBe(20);
    expect(res.data.error).toBe("글 비밀번호가 일치하지 않습니다. 5회 틀려 20분간 잠겼습니다.");
  });

  it("잠긴 동안에는 맞는 글 비밀번호로도 수정·삭제할 수 없다", async () => {
    const entry = await createEntry();
    const me = newRequester();
    await failTimes(entry.id, me, 5);
    const edit = await api.edit(entry.id, { message: "ok", password: PASSWORD }, me);
    expect(edit.status).toBe(429);
    expect(edit.data.error).toMatch(/^글 비밀번호를 5회 틀려 잠겼습니다\. 약 \d+분 후 다시 시도하세요\.$/);
    expect(edit.data.retryAfterMinutes).toBeGreaterThanOrEqual(19);
    expect(edit.data.retryAfterMinutes).toBeLessThanOrEqual(20);
    expect((await api.remove(entry.id, { password: PASSWORD }, me)).status).toBe(429);
    const list = await api.list();
    expect(list.data.find((e: { id: number }) => e.id === entry.id).message).toBe(entry.message);
  });

  it("틀린 글 비밀번호를 동시에 여러 번 보내도 잠금이 풀리지 않는다", async () => {
    const entry = await createEntry();
    const me = newRequester();
    const results = await Promise.all(
      Array.from({ length: 12 }, () => api.edit(entry.id, { message: "x", password: WRONG_PASSWORD }, me)),
    );
    expect(results.filter((r) => r.status === 403).length).toBeLessThanOrEqual(4);
    const after = await api.edit(entry.id, { message: "ok", password: PASSWORD }, me);
    expect(after.status).toBe(429);
  });

  it("같은 글이라도 다른 요청자는 잠기지 않는다", async () => {
    const entry = await createEntry();
    await failTimes(entry.id, newRequester(), 5);
    const res = await api.edit(entry.id, { message: "작성자 수정", password: PASSWORD }, newRequester());
    expect(res.status).toBe(200);
  });

  it("같은 요청자라도 다른 글은 잠기지 않는다", async () => {
    const locked = await createEntry();
    const other = await createEntry();
    const me = newRequester();
    await failTimes(locked.id, me, 5);
    const res = await api.edit(other.id, { message: "다른 글", password: PASSWORD }, me);
    expect(res.status).toBe(200);
  });
});

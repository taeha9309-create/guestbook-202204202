import { afterAll, describe, expect, it } from "vitest";
import { api, canSimulateRequesters, cleanup, createEntry, newRequester } from "./client";

afterAll(cleanup);

describe.skipIf(!canSimulateRequesters)("실패 시도와 남은 시도", () => {
  it("틀린 글 비밀번호로 수정하면 남은 시도가 안내된다", async () => {
    const entry = await createEntry();
    const me = newRequester();
    const res = await api.edit(entry.id, { message: "x", password: "wrong!" }, me);
    expect(res.status).toBe(403);
    expect(res.data.remainingAttempts).toBe(4);
    expect(res.data.error).toBe("비밀번호가 일치하지 않습니다. (남은 시도 4회)");
  });

  it("수정 실패와 삭제 실패는 합쳐서 센다", async () => {
    const entry = await createEntry();
    const me = newRequester();
    await api.edit(entry.id, { message: "x", password: "wrong!" }, me);
    await api.edit(entry.id, { message: "x", password: "wrong!" }, me);
    const res = await api.remove(entry.id, { password: "wrong!" }, me);
    expect(res.status).toBe(403);
    expect(res.data.remainingAttempts).toBe(2);
  });

  it("맞는 글 비밀번호로 성공하면 남은 시도가 5로 돌아간다", async () => {
    const entry = await createEntry();
    const me = newRequester();
    await api.edit(entry.id, { message: "x", password: "wrong!" }, me);
    await api.edit(entry.id, { message: "x", password: "wrong!" }, me);
    expect((await api.edit(entry.id, { message: "ok", password: "pw1234" }, me)).status).toBe(200);
    const res = await api.edit(entry.id, { message: "x", password: "wrong!" }, me);
    expect(res.data.remainingAttempts).toBe(4);
  });

  it("다른 요청자의 실패는 내 남은 시도에 영향이 없다", async () => {
    const entry = await createEntry();
    const other = newRequester();
    await api.edit(entry.id, { message: "x", password: "wrong!" }, other);
    await api.edit(entry.id, { message: "x", password: "wrong!" }, other);
    const res = await api.edit(entry.id, { message: "x", password: "wrong!" }, newRequester());
    expect(res.data.remainingAttempts).toBe(4);
  });
});

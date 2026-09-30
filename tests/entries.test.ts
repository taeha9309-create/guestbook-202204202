import { afterAll, describe, expect, it } from "vitest";
import { api, cleanup, createEntry, newRequester } from "./client";

afterAll(cleanup);

describe("글 작성", () => {
  it("작성자 이름, 메시지, 글 비밀번호로 글을 남길 수 있다", async () => {
    const res = await api.create({ name: "  김태하  ", message: "  안녕하세요  ", password: "pw1234" });
    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({ name: "김태하", message: "안녕하세요", updated_at: null });
    expect(res.data).not.toHaveProperty("password_hash");
    await api.remove(res.data.id, { password: "pw1234" }, newRequester());
  });

  it.each([
    ["빈 이름", { name: "", message: "m", password: "pw1234" }],
    ["공백만 있는 이름", { name: "   ", message: "m", password: "pw1234" }],
    ["31자 이름", { name: "가".repeat(31), message: "m", password: "pw1234" }],
    ["공백만 있는 메시지", { name: "n", message: "   ", password: "pw1234" }],
    ["501자 메시지", { name: "n", message: "a".repeat(501), password: "pw1234" }],
    ["3자 글 비밀번호", { name: "n", message: "m", password: "123" }],
    ["51자 글 비밀번호", { name: "n", message: "m", password: "a".repeat(51) }],
  ])("%s이면 400으로 거부된다", async (_, body) => {
    const res = await api.create(body);
    expect(res.status).toBe(400);
    expect(typeof res.data.error).toBe("string");
  });
});

describe("글 조회", () => {
  it("작성 시각 최신순으로 보이고 글 비밀번호 해시는 노출되지 않는다", async () => {
    const older = await createEntry();
    const newer = await createEntry();
    const res = await api.list();
    expect(res.status).toBe(200);
    const ids = res.data.map((e: { id: number }) => e.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
    for (const e of res.data) expect(e).not.toHaveProperty("password_hash");
  });
});

describe("글 수정", () => {
  it("맞는 글 비밀번호로 메시지만 수정되고 수정됨 상태가 된다", async () => {
    const entry = await createEntry({ name: "원래이름" });
    const res = await api.edit(entry.id, { message: "고친 메시지", password: "pw1234", name: "바꾼이름" }, newRequester());
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ id: entry.id, name: "원래이름", message: "고친 메시지", created_at: entry.created_at });
    expect(res.data.updated_at).not.toBeNull();
  });

  it("틀린 글 비밀번호면 403으로 거부되고 메시지는 그대로다", async () => {
    const entry = await createEntry();
    const res = await api.edit(entry.id, { message: "해킹", password: "wrong!" }, newRequester());
    expect(res.status).toBe(403);
    expect(res.data.error).toContain("비밀번호가 일치하지 않습니다");
    const list = await api.list();
    expect(list.data.find((e: { id: number }) => e.id === entry.id).message).toBe(entry.message);
  });

  it("수정 메시지가 비어 있으면 400이다", async () => {
    const entry = await createEntry();
    const res = await api.edit(entry.id, { message: "  ", password: "pw1234" }, newRequester());
    expect(res.status).toBe(400);
  });
});

describe("글 삭제", () => {
  it("맞는 글 비밀번호로 완전히 삭제된다", async () => {
    const entry = await createEntry();
    const res = await api.remove(entry.id, { password: "pw1234" }, newRequester());
    expect(res.status).toBe(200);
    const list = await api.list();
    expect(list.data.some((e: { id: number }) => e.id === entry.id)).toBe(false);
  });

  it("틀린 글 비밀번호면 403으로 거부되고 글은 남아 있다", async () => {
    const entry = await createEntry();
    const res = await api.remove(entry.id, { password: "wrong!" }, newRequester());
    expect(res.status).toBe(403);
    const list = await api.list();
    expect(list.data.some((e: { id: number }) => e.id === entry.id)).toBe(true);
  });

  it("없는 글의 수정·삭제는 404다", async () => {
    const entry = await createEntry();
    await api.remove(entry.id, { password: "pw1234" }, newRequester());
    expect((await api.edit(entry.id, { message: "x", password: "pw1234" }, newRequester())).status).toBe(404);
    expect((await api.remove(entry.id, { password: "pw1234" }, newRequester())).status).toBe(404);
  });
});

"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: number;
  name: string;
  message: string;
  created_at: string;
  updated_at: string | null;
};

type Mode = { id: number; kind: "edit" | "delete" } | null;

const input = "w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white";
const btn = "rounded px-3 py-2 text-sm font-medium disabled:opacity-50";

function fmt(s: string) {
  return new Date(s).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function Guestbook() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [mode, setMode] = useState<Mode>(null);
  const [editText, setEditText] = useState("");
  const [actionPw, setActionPw] = useState("");
  const [actionError, setActionError] = useState("");
  const [acting, setActing] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/entries", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setEntries(await res.json());
      setLoadError("");
    } catch {
      setLoadError("목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 목록 로드
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error ?? "작성에 실패했습니다.");
        return;
      }
      setName("");
      setMessage("");
      setPassword("");
      await load();
    } catch {
      setFormError("작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function open(entry: Entry, kind: "edit" | "delete") {
    setMode({ id: entry.id, kind });
    setEditText(entry.message);
    setActionPw("");
    setActionError("");
  }

  async function confirm(entry: Entry) {
    if (!mode) return;
    setActing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: mode.kind === "edit" ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode.kind === "edit" ? { message: editText, password: actionPw } : { password: actionPw },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error ?? "요청에 실패했습니다.");
        return;
      }
      setMode(null);
      await load();
    } catch {
      setActionError("요청에 실패했습니다.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold">글 남기기</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={input} placeholder="이름" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={input} type="password" placeholder="비밀번호 (4자 이상)" minLength={4} maxLength={50} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <textarea className={input} rows={3} placeholder="메시지" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} required />
        {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
        <button className={`${btn} bg-blue-600 text-white hover:bg-blue-700`} disabled={submitting}>
          {submitting ? "등록 중..." : "등록"}
        </button>
      </form>

      <section>
        <h2 className="mb-3 font-semibold">방명록 ({entries.length})</h2>
        {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}
        {loadError && <p role="alert" className="text-sm text-red-600">{loadError}</p>}
        {!loading && !loadError && entries.length === 0 && (
          <p className="text-sm text-gray-500">아직 글이 없습니다. 첫 글을 남겨보세요!</p>
        )}
        <ul className="space-y-3">
          {entries.map((entry) => {
            const active = mode?.id === entry.id ? mode : null;
            return (
              <li key={entry.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <strong>{entry.name}</strong>
                  <span className="text-xs text-gray-500">
                    {fmt(entry.created_at)}
                    {entry.updated_at && " (수정됨)"}
                  </span>
                </div>

                {active?.kind === "edit" ? (
                  <textarea className={`${input} mt-2`} rows={3} maxLength={500} value={editText} onChange={(e) => setEditText(e.target.value)} />
                ) : (
                  <p className="mt-2 whitespace-pre-wrap break-words">{entry.message}</p>
                )}

                {active ? (
                  <div className="mt-3 space-y-2">
                    <input
                      className={input}
                      type="password"
                      placeholder="작성 시 입력한 비밀번호"
                      value={actionPw}
                      onChange={(e) => setActionPw(e.target.value)}
                      autoFocus
                    />
                    {active.kind === "delete" && <p className="text-sm text-gray-600">비밀번호를 입력하고 삭제를 확인하세요.</p>}
                    {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`${btn} ${active.kind === "edit" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"} text-white`}
                        disabled={acting || !actionPw}
                        onClick={() => confirm(entry)}
                      >
                        {active.kind === "edit" ? "수정 완료" : "삭제 확인"}
                      </button>
                      <button type="button" className={`${btn} bg-gray-100 text-gray-800 hover:bg-gray-200`} onClick={() => setMode(null)}>
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button type="button" className={`${btn} bg-gray-100 text-gray-800 hover:bg-gray-200`} onClick={() => open(entry, "edit")}>
                      수정
                    </button>
                    <button type="button" className={`${btn} bg-gray-100 text-red-600 hover:bg-gray-200`} onClick={() => open(entry, "delete")}>
                      삭제
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
        guestbook-202204202 · Next.js + Neon Postgres + Vercel
      </footer>
    </div>
  );
}

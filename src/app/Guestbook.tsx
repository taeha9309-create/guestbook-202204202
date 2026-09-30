"use client";

import { useEffect, useRef, useState } from "react";

type Entry = {
  id: number;
  name: string;
  message: string;
  created_at: string;
  updated_at: string | null;
};

type Mode = { id: number; kind: "edit" | "delete" } | null;

const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100";
const btn = "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const card = "rounded-2xl bg-white/90 p-5 shadow-[0_4px_24px_-8px_rgba(79,70,229,0.18)] ring-1 ring-slate-100 backdrop-blur";

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-600",
  "bg-pink-100 text-pink-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-600",
  "bg-violet-100 text-violet-600",
  "bg-rose-100 text-rose-600",
  "bg-teal-100 text-teal-600",
];

/** 작성자 이름으로 색을 정해 같은 이름은 항상 같은 색이 되게 한다. */
function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function exactTime(s: string) {
  return new Date(s).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

const rtf = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });

function relativeTime(s: string, now: number) {
  const sec = Math.round((new Date(s).getTime() - now) / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return "방금 전";
  if (abs < 3600) return rtf.format(Math.round(sec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(sec / 86400), "day");
  return exactTime(s);
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
      {children}
    </p>
  );
}

export default function Guestbook() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [now, setNow] = useState(() => Date.now());

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

  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showToast(text: string) {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2500);
  }

  async function load() {
    try {
      const res = await fetch("/api/entries", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setEntries(await res.json());
      setNow(Date.now());
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
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
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
      showToast("글이 등록되었습니다");
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
    const kind = mode.kind;
    setActing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: kind === "edit" ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "edit" ? { message: editText, password: actionPw } : { password: actionPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error ?? "요청에 실패했습니다.");
        return;
      }
      setMode(null);
      await load();
      showToast(kind === "edit" ? "글이 수정되었습니다" : "글이 삭제되었습니다");
    } catch {
      setActionError("요청에 실패했습니다.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className={`${card} space-y-3`}>
        <h2 className="text-base font-bold text-slate-800">✍️ 글 남기기</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={input} placeholder="작성자 이름" aria-label="작성자 이름" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} required />
          <input
            className={input}
            type="password"
            placeholder="글 비밀번호 (4자 이상)"
            aria-label="글 비밀번호"
            minLength={4}
            maxLength={50}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <textarea
          className={`${input} resize-none`}
          rows={3}
          placeholder="따뜻한 한 마디를 남겨 주세요"
          aria-label="메시지"
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        {formError && <ErrorText>{formError}</ErrorText>}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{message.length}/500</span>
          <button className={`${btn} bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200 hover:brightness-110`} disabled={submitting}>
            {submitting ? "등록 중..." : "등록하기"}
          </button>
        </div>
      </form>

      <section>
        <h2 className="mb-3 flex items-center gap-2 px-1 text-base font-bold text-slate-800">
          방명록
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-600">{entries.length}</span>
        </h2>
        {loading && <p className="px-1 text-sm text-slate-500">불러오는 중...</p>}
        {loadError && <ErrorText>{loadError}</ErrorText>}
        {!loading && !loadError && entries.length === 0 && (
          <div className={`${card} text-center text-sm text-slate-500`}>아직 글이 없습니다. 첫 글을 남겨보세요! 🌱</div>
        )}
        <ul className="space-y-3">
          {entries.map((entry) => {
            const active = mode?.id === entry.id ? mode : null;
            return (
              <li key={entry.id} className={card}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold ${avatarColor(entry.name)}`} aria-hidden>
                    {entry.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <strong className="block truncate text-slate-800">{entry.name}</strong>
                        <time dateTime={entry.created_at} title={exactTime(entry.created_at)} className="text-xs text-slate-400">
                          {relativeTime(entry.created_at, now)}
                          {entry.updated_at && " · (수정됨)"}
                        </time>
                      </div>
                      {!active && (
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            aria-label="수정"
                            title="수정"
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            onClick={() => open(entry, "edit")}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            aria-label="삭제"
                            title="삭제"
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            onClick={() => open(entry, "delete")}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      )}
                    </div>

                    {active?.kind === "edit" ? (
                      <textarea
                        className={`${input} mt-3 resize-none`}
                        rows={3}
                        aria-label="수정할 메시지"
                        maxLength={500}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-700">{entry.message}</p>
                    )}

                    {active && (
                      <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          {active.kind === "edit" ? "글 비밀번호를 입력하고 수정을 완료하세요." : "글 비밀번호를 입력하면 이 글이 완전히 삭제됩니다."}
                        </p>
                        <input
                          className={input}
                          type="password"
                          placeholder="작성 시 입력한 글 비밀번호"
                          aria-label="글 비밀번호 확인"
                          value={actionPw}
                          onChange={(e) => setActionPw(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && actionPw && !acting && confirm(entry)}
                          autoFocus
                        />
                        {actionError && <ErrorText>{actionError}</ErrorText>}
                        <div className="flex justify-end gap-2">
                          <button type="button" className={`${btn} bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100`} onClick={() => setMode(null)}>
                            취소
                          </button>
                          <button
                            type="button"
                            className={`${btn} text-white ${active.kind === "edit" ? "bg-indigo-500 hover:bg-indigo-600" : "bg-red-500 hover:bg-red-600"}`}
                            disabled={acting || !actionPw}
                            onClick={() => confirm(entry)}
                          >
                            {acting ? "처리 중..." : active.kind === "edit" ? "수정 완료" : "삭제 확인"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="pt-2 text-center text-xs text-slate-400">guestbook-202204202 · Next.js + Neon Postgres + Vercel</footer>

      {toast && (
        <div role="status" className="toast fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900/90 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          ✅ {toast}
        </div>
      )}
    </div>
  );
}

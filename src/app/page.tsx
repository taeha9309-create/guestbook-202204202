import Guestbook from "./Guestbook";
import { DEVELOPER } from "@/lib/developer";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
      <header className="mb-8 text-center">
        <p className="text-4xl" aria-hidden>
          📖
        </p>
        <h1 className="mt-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
          미니 방명록
        </h1>
        <p className="mt-2 text-sm text-slate-500">가입 없이 한 마디 남겨 주세요. 글 비밀번호로 내 글만 고치고 지울 수 있어요.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-white/80 px-3 py-1 text-indigo-600 shadow-sm ring-1 ring-indigo-100">
            개발자 {DEVELOPER.name}
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-pink-600 shadow-sm ring-1 ring-pink-100">
            학번 {DEVELOPER.studentId}
          </span>
        </div>
      </header>
      <Guestbook />
    </main>
  );
}

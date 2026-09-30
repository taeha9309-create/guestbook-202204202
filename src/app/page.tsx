import Guestbook from "./Guestbook";
import { DEVELOPER } from "@/lib/developer";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">미니 방명록</h1>
        <p className="mt-2 text-sm text-gray-600">
          개발자: <strong>{DEVELOPER.name}</strong> · 학번: <strong>{DEVELOPER.studentId}</strong>
        </p>
      </header>
      <Guestbook />
    </main>
  );
}

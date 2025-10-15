import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-5">
      <div className="bg-white border border-slate-200 rounded-[10px] p-10 max-w-[500px] w-full shadow-xl shadow-slate-200/60">
        <div className="text-center mb-8">
          <h1>AI 教學工具</h1>
          <p className="text-sm text-slate-500 leading-6">選擇您要使用的 AI 教學工具</p>
        </div>

        <div
          className="bg-slate-50 border border-slate-200 rounded-[10px] p-5 transition-all cursor-pointer hover:border-emerald-500 hover:[box-shadow:0_0_0_2px_rgba(34,197,94,0.2)]"
          role="link"
          tabIndex={0}
        >
          <span className="text-2xl mb-3 block" aria-hidden>
            🎓
          </span>
          <h3 className="text-base font-semibold text-slate-800 mb-2">模擬課程試聽工具</h3>
          <p className="text-slate-500 text-sm leading-6 mb-4">
            提供完整的 AI 互動教學體驗，包含編劇 Bot、學生 Bot 和教練 Bot 的協作流程。
          </p>
          <Link
            href="/trialLesson/guideBook"
            className="inline-flex items-center gap-2 bg-gradient-to-b from-emerald-600 to-emerald-700 border border-emerald-400/40 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all w-full justify-center hover:brightness-105 no-underline"
          >
            <span>進入工具</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

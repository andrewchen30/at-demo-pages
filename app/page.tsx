import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="dashboard-page">
      <div className="dashboard-container shadow-xl shadow-slate-200/60">
        <div className="header">
          <h1>AI 教學工具</h1>
          <p>選擇您要使用的 AI 教學工具</p>
        </div>

        <div className="tool-card" role="link" tabIndex={0}>
          <span className="tool-icon" aria-hidden>🎓</span>
          <h3 className="tool-title">模擬課程試聽工具</h3>
          <p className="tool-description">
            提供完整的 AI 互動教學體驗，包含編劇 Bot、學生 Bot 和教練 Bot 的協作流程。
          </p>
          <Link href="/sim-class-trial-lesson" className="tool-link">
            <span>進入工具</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

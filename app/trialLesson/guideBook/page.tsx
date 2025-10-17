'use client';

import { FormEvent, MouseEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { GUIDE_CONTENT } from './guideContent';

function GuideBookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [nameInputValue, setNameInputValue] = useState('');

  const currentContent = GUIDE_CONTENT[selectedChapter];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 依據 URL query 同步 selectedChapter；若無或非法，預設為 1 並 replace 到 URL
    const chapterParam = searchParams.get('chapter');
    const parsed = chapterParam ? parseInt(chapterParam, 10) : NaN;
    const maxChapter = Object.keys(GUIDE_CONTENT).length;
    const isValid = Number.isInteger(parsed) && parsed >= 1 && parsed <= maxChapter;
    const finalChapter = isValid ? parsed : 1;
    setSelectedChapter(finalChapter);
    if (!isValid || chapterParam === null) {
      const url = new URL(window.location.href);
      url.searchParams.set('chapter', String(finalChapter));
      router.replace(url.pathname + '?' + url.searchParams.toString());
    }

    const storedName = localStorage.getItem('teacherName');
    if (storedName) {
      setTeacherName(storedName);
      setNameInputValue(storedName);
    } else {
      setIsNameDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 點擊章節時更新 URL 的 chapter（push 以支援返回）
  const handleChapterClick = (nextChapter: number) => {
    setSelectedChapter(nextChapter);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('chapter', String(nextChapter));
    router.push(url.pathname + '?' + url.searchParams.toString());
  };

  const handleNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = nameInputValue.trim();
    if (!trimmedName) return;
    localStorage.setItem('teacherName', trimmedName);
    setTeacherName(trimmedName);
    setIsNameDialogOpen(false);
  };

  const handlePracticeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!teacherName.trim()) {
      event.preventDefault();
      setNameInputValue(teacherName);
      setIsNameDialogOpen(true);
    }
  };

  const handleEditName = () => {
    setNameInputValue(teacherName);
    setIsNameDialogOpen(true);
  };

  // 簡單的 Markdown 渲染函數（以 Tailwind 呈現）
  const renderMarkdown = (markdown: string) => {
    const lines = markdown.trim().split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 標題
      if (line.startsWith('## ')) {
        elements.push(
          <h2
            key={key++}
            className="text-[28px] font-bold text-slate-800 mt-8 mb-4 pb-3 border-b-2 border-slate-200 first:mt-0"
          >
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={key++} className="text-[22px] font-semibold text-slate-800 my-6">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={key++} className="text-[18px] font-semibold text-slate-800 my-5">
            {line.replace('#### ', '')}
          </h4>
        );
      }
      // 無序列表
      else if (line.startsWith('- ')) {
        const listItems: string[] = [];
        let j = i;
        while (j < lines.length && lines[j].startsWith('- ')) {
          listItems.push(lines[j].replace(/^- /, ''));
          j++;
        }
        elements.push(
          <ul key={key++} className="my-4 pl-6 list-disc">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-base leading-8 text-slate-800 my-2">
                {item}
              </li>
            ))}
          </ul>
        );
        i = j - 1;
      }
      // 空行
      else if (line.trim() === '') {
        continue;
      }
      // 一般段落
      else {
        elements.push(
          <p key={key++} className="text-base leading-8 text-slate-800 my-3">
            {line}
          </p>
        );
      }
    }

    return elements;
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-[100px]">
        <div className="flex w-full min-h-[calc(100vh-100px)] md:flex-row flex-col">
          {/* 左側側邊欄 */}
          <aside className="md:w-[320px] w-full bg-white md:border-r border-slate-200 md:sticky md:top-0 md:h-[calc(100vh-100px)] md:flex md:flex-col md:overflow-hidden">
            <div className="px-6 pt-8 pb-6 border-b border-slate-200">
              {/* <h2 className="text-[34px] font-bold text-slate-800 m-0">體驗課培訓</h2> */}
              <div className="text-[26px] font-bold text-slate-800 m-0">❶ 選擇體驗課培訓主題</div>
            </div>
            <div className="p-4 flex md:flex-col flex-row gap-3 md:flex-1 md:overflow-y-auto overflow-x-auto">
              {Object.entries(GUIDE_CONTENT).map(([number, content]) => (
                <button
                  key={number}
                  className={`min-w-[240px] md:min-w-0 flex flex-row items-center gap-3 p-4 bg-white border rounded-2xl cursor-pointer transition text-left w-full shadow-[0_1px_4px_rgba(0,0,0,0.04)] ${
                    Number(number) === selectedChapter
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-700 shadow-[0_6px_18px_rgba(59,130,246,0.22)]'
                      : 'border-slate-200 hover:border-blue-500 hover:shadow-[0_2px_10px_rgba(59,130,246,0.12)] hover:-translate-y-0.5'
                  }`}
                  onClick={() => handleChapterClick(Number(number))}
                >
                  <span
                    className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-md tracking-[0.5px] flex-shrink-0 ${
                      Number(number) === selectedChapter ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    主題 {number}
                  </span>
                  <div
                    className={`text-[15px] font-semibold leading-[1.4] ${
                      Number(number) === selectedChapter ? 'text-white' : 'text-slate-800'
                    }`}
                  >
                    {content.sidebarTitle}
                  </div>
                </button>
              ))}
            </div>
            {/* 老師姓名設定（移至側邊欄左下角） */}
            <div className="px-6 pb-6 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-4 flex-wrap bg-blue-50/80 border border-blue-600/20 rounded-[14px] px-5 py-3 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]">
                <div className="text-xs font-bold tracking-[0.04em] text-blue-600">老師姓名</div>
                <div className="text-base font-semibold text-slate-800 min-w-[120px]">{teacherName || '尚未設定'}</div>
                <button
                  type="button"
                  className="bg-white border border-blue-600/35 text-blue-600 text-sm font-semibold px-4 py-2 rounded-full transition hover:bg-blue-600/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
                  onClick={handleEditName}
                >
                  {teacherName ? '變更' : '設定'}
                </button>
              </div>
            </div>
          </aside>

          {/* 右側內容區 */}
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="max-w-[900px] mx-auto p-12 md:p-8">
              {/* 大標題 */}
              <header className="mb-8">
                <h2 className="text-[26px] font-bold text-slate-800 m-0">
                ❷ 觀看主題教學
                </h2>
                <p className="text-[16px] text-slate-600 leading-[1.6] m-0">主題{selectedChapter}：{currentContent.sidebarTitle}</p>
              </header>

              {/* YouTube 影片 */}
              <div className="relative w-full pb-[56.25%] mb-10 rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
                <iframe
                  className="absolute inset-0 w-full h-full border-0"
                  src={currentContent.videoUrl}
                  title={currentContent.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* 總結區塊 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 mb-8 border-2 border-blue-200 shadow-[0_4px_16px_rgba(59,130,246,0.15)]">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">💡</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-[22px] font-bold text-blue-900 mb-3 m-0">本主題總結</h2>
                    <p className="text-[17px] leading-[1.7] text-slate-800 m-0 font-medium">{currentContent.summary}</p>
                  </div>
                </div>
              </div>

              {/* 檢查清單區塊 */}
              <article className="bg-white rounded-2xl p-10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-3 mb-8 pb-5 border-b-2 border-slate-200">
                  <span className="text-3xl">📋</span>
                  <h2 className="text-[26px] font-bold text-slate-800 m-0">重點提示檢查清單</h2>
                </div>
                {renderMarkdown(currentContent.checklistWithGuidience)}
              </article>
            </div>
          </div>
        </div>

        {/* 底部固定 Bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-[320px] bg-white/90 backdrop-blur-md border-t border-slate-200 flex items-center justify-center shadow-[0_-6px_24px_rgba(0,0,0,0.06)] z-[100] p-4 md:h-[88px]">
          <div className="w-[min(1160px,calc(100%-64px))] flex items-center justify-center gap-4 md:flex-row flex-col">
            <Link
              href={`/trialLesson/sim?chapter=${selectedChapter}`}
              className="group inline-flex items-center justify-center gap-3 px-8 py-3 bg-gradient-to-b from-blue-600 to-blue-700 text-white text-base font-semibold rounded-full no-underline transition shadow-[0_8px_20px_rgba(37,99,235,0.35)] border border-white/20 hover:brightness-105 w-auto max-w-full"
              onClick={handlePracticeClick}
            >
              <span className="whitespace-nowrap">❸ 完成課程，前往模擬練習</span>
              {/* <span className="text-sm opacity-90 hidden md:inline">
                主題 {selectedChapter} - {currentContent.sidebarTitle}
              </span> */}
              <span className="text-[18px] font-bold transition-transform group-hover:translate-x-1.5">→</span>
            </Link>
          </div>
        </div>
      </main>

      {isNameDialogOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-[500px] w-[90%] overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 m-0">👋 歡迎使用 AI 教學工具</h3>
            </div>
            <div className="p-5">
              <form onSubmit={handleNameSubmit}>
                <div className="mb-5">
                  <label htmlFor="guide-teacher-name" className="block mb-2 font-medium text-sm">
                    請輸入您的名字
                  </label>
                  <input
                    id="guide-teacher-name"
                    type="text"
                    value={nameInputValue}
                    onChange={(e) => setNameInputValue(e.target.value)}
                    placeholder="請輸入名字"
                    required
                    autoFocus
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm outline-none transition focus:border-blue-500"
                  />
                  <p className="mt-2 text-xs text-slate-500 leading-6">💡 請輸入與 AmazingTalker 站上相同的名字</p>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-b from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium"
                >
                  確認
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function GuideBookPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
          <div className="flex w-full min-h-[calc(100vh-100px)] md:flex-row flex-col">
            <aside className="md:w-[320px] w-full bg-white md:border-r border-slate-200 md:sticky md:top-0 md:h-[calc(100vh-100px)] md:flex md:flex-col md:overflow-hidden">
              <div className="px-6 pt-8 pb-6 border-b border-slate-200">
                <h2 className="text-[20px] font-bold text-slate-800 m-0">體驗課培訓主題</h2>
              </div>
            </aside>
            <div className="flex-1 overflow-y-auto bg-slate-50">
              <div className="max-w-[900px] mx-auto p-12 md:p-8">
                <div className="text-lg font-semibold text-slate-800">載入中...</div>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <GuideBookContent />
    </Suspense>
  );
}

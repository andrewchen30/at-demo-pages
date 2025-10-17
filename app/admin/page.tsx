'use client';

import { type CSSProperties } from 'react';

const ADMIN_TOOLS = [
  {
    href: '/admin/chatLogViewer',
    title: 'ChatLog 檢視器',
    description: '從 Google Spreadsheet 載入 ChatLog 記錄，檢視師生對話內容、背景資訊，支援按教師篩選與時間排序。',
    accent: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
  },
  {
    href: '/admin/studentScriptViewer',
    title: '學生腳本管理器',
    description: '查看和管理 AI 生成的學生角色，支援批次新增、單個/批次刪除，美觀呈現角色背景與對話腳本。',
    accent: 'linear-gradient(90deg, #f59e0b, #d97706)',
  },
  {
    href: 'https://docs.google.com/spreadsheets/d/1zFuwHybj2ny4n8vVk7BlZJqUMUKCpxZ44GhqxQc_9N8/edit?gid=88030258#gid=88030258',
    title: 'Google Spreadsheet 資料庫入口',
    description: '開啟 Google Sheet 資料庫入口（管理資料與檢視表單）。',
    accent: 'linear-gradient(90deg, #10b981, #059669)',
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-[1200px] w-full mx-auto px-5 py-10 flex flex-col gap-6">
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="p-5 flex flex-col gap-2 border-b border-slate-200">
            <h1 className="text-xl font-semibold text-slate-800">管理後台</h1>
            <p className="text-sm text-slate-500 leading-6">管理系統資料與工具</p>
          </div>
          <div className="p-5" style={{ marginBottom: '32px' }}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 items-stretch">
              {ADMIN_TOOLS.map((tool) => (
                <a
                  key={tool.href}
                  href={tool.href}
                  className="relative flex flex-col gap-3 p-5 bg-white border border-slate-200 rounded-xl text-slate-900 no-underline min-h-[180px] transition ease-in-out duration-200 overflow-hidden hover:-translate-y-0.5 hover:shadow-xl"
                  style={{ ['--admin-card-accent' as any]: tool.accent } as CSSProperties}
                >
                  <span className="text-base font-semibold leading-6 m-0 whitespace-normal break-words">
                    {tool.title}
                  </span>
                  <p className="text-sm leading-6 text-slate-500 m-0 whitespace-normal flex-1 break-words">
                    {tool.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                    前往<span aria-hidden="true">→</span>
                  </span>
                  <span
                    className="absolute inset-x-0 top-0 h-1"
                    style={{ background: 'var(--admin-card-accent, linear-gradient(90deg, #0ea5e9, #0284c7))' }}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

import type { Metadata } from 'next';
import './tailwind.css';

export const metadata: Metadata = {
  title: 'AI 教學工具 Dashboard',
  description: 'AI 教學工具合集',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}

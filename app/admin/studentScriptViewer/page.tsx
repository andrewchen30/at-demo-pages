'use client';

import { useState, useEffect } from 'react';

interface PersonaItem {
  index: number;
  section_title: string;
  information_title: string;
  information_key: string;
  information: string;
}

interface ScriptItem {
  index: number;
  script: string[];
}

interface ParsedStudentData {
  persona: PersonaItem[];
  scripts: ScriptItem[];
}

interface StudentRecord {
  id: string;
  raw: string;
  created_at: string;
  updated_at: string;
  parsed?: ParsedStudentData;
  name?: string;
}

export default function StudentScriptViewerPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateCount, setGenerateCount] = useState('5');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // 載入資料
  useEffect(() => {
    fetchStudents();
  }, []);

  // 當選中的學生改變時，重置折疊狀態
  useEffect(() => {
    setCollapsedSections(new Set());
  }, [selectedStudentId]);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/students/list');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '獲取資料失敗');
      }

      // 解析所有 raw 資料
      const studentsWithParsed = result.data.map((student: StudentRecord) => {
        let parsed: ParsedStudentData | undefined;
        let name: string | undefined;

        try {
          parsed = JSON.parse(student.raw);
          // 從 persona 中提取名字
          const nameItem = parsed?.persona?.find((p) => p.information_key === 'name');
          name = nameItem?.information || '未命名';
        } catch {
          // 解析失敗，保持 undefined
        }

        return {
          ...student,
          parsed,
          name,
        };
      });

      setStudents(studentsWithParsed);

      // 如果有選中的角色，確保它還在列表中
      if (selectedStudentId && !studentsWithParsed.find((s: StudentRecord) => s.id === selectedStudentId)) {
        setSelectedStudentId(null);
      }
    } catch (err) {
      console.error('載入資料失敗:', err);
      setError(err instanceof Error ? err.message : '載入資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return;

    const confirmMessage = `確定要刪除 ${ids.length} 個學生角色嗎？此操作無法復原。`;
    if (!confirm(confirmMessage)) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/students/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '刪除失敗');
      }

      // 清空選擇
      setSelectedIds(new Set());
      if (ids.includes(selectedStudentId || '')) {
        setSelectedStudentId(null);
      }

      // 重新載入
      await fetchStudents();
    } catch (err) {
      console.error('刪除失敗:', err);
      setError(err instanceof Error ? err.message : '刪除失敗');
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerate = async () => {
    const count = parseInt(generateCount, 10);
    if (isNaN(count) || count <= 0) {
      alert('請輸入有效的數量（大於 0 的整數）');
      return;
    }

    setGenerating(true);
    setError(null);
    setShowGenerateDialog(false);

    try {
      const response = await fetch('/api/students/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error?.message || '生成失敗');
      }

      // 重新載入
      await fetchStudents();
    } catch (err) {
      console.error('生成失敗:', err);
      setError(err instanceof Error ? err.message : '生成失敗');
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  };

  const toggleSection = (sectionTitle: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionTitle)) {
      newCollapsed.delete(sectionTitle);
    } else {
      newCollapsed.add(sectionTitle);
    }
    setCollapsedSections(newCollapsed);
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // 按 section_title 分組 persona
  const groupedPersona = selectedStudent?.parsed?.persona.reduce((acc, item) => {
    if (!acc[item.section_title]) {
      acc[item.section_title] = [];
    }
    acc[item.section_title].push(item);
    return acc;
  }, {} as Record<string, PersonaItem[]>);

  return (
    <main className="h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col overflow-hidden">
      {/* 頂部導航欄 */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
            學生腳本管理器
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>查看和管理 AI 生成的學生角色</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={fetchStudents}
            disabled={loading || deleting || generating}
            className={`inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all border ${
              loading || deleting || generating
                ? 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed'
                : 'bg-slate-600 text-white border-slate-600 hover:brightness-105'
            }`}
          >
            {loading ? '載入中...' : '🔄 重新載入'}
          </button>
          <a
            href="/admin"
            style={{
              color: 'var(--accent)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            ← 返回管理後台
          </a>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderBottom: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '14px',
            flexShrink: 0,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* 三欄式佈局 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左側邊欄 - 角色列表 */}
        <div
          style={{
            width: '320px',
            borderRight: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>角色列表</h2>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  backgroundColor: 'var(--panel)',
                  padding: '4px 8px',
                  borderRadius: '12px',
                }}
              >
                {students.length}
              </span>
            </div>

            {students.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.size === students.length && students.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>全選 ({selectedIds.size} 已選)</span>
                </label>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--muted)',
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>載入中...</div>
              </div>
            ) : students.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--muted)',
                }}
              >
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>👤</div>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>尚無學生角色</div>
                <div style={{ fontSize: '12px' }}>請先生成學生角色</div>
              </div>
            ) : (
              <div>
                {students.map((student) => (
                  <div
                    key={student.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      backgroundColor:
                        selectedStudentId === student.id
                          ? '#f0f9ff'
                          : selectedIds.has(student.id)
                          ? '#fef3c7'
                          : 'transparent',
                      borderLeft:
                        selectedStudentId === student.id
                          ? '3px solid #3b82f6'
                          : selectedIds.has(student.id)
                          ? '3px solid #fbbf24'
                          : '3px solid transparent',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'start',
                      gap: '8px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(student.id)}
                      onChange={() => toggleSelection(student.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedStudentId(student.id)}>
                      <div
                        style={{
                          fontWeight: '600',
                          fontSize: '13px',
                          color: 'var(--text)',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        👤 {student.name || '未命名'}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--muted)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <div style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                          ID: {student.id.substring(0, 8)}...
                        </div>
                        <div style={{ fontSize: '10px' }}>
                          {new Date(student.created_at).toLocaleString('zh-TW', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete([student.id]);
                      }}
                      disabled={deleting}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: '#dc2626',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 中間主要內容 - 角色詳情 */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          {selectedStudent && selectedIds.size <= 1 ? (
            <>
              {/* 角色標題列 */}
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: 'var(--panel)',
                  flexShrink: 0,
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text)', marginBottom: '4px' }}>
                  👤 學生：{selectedStudent.name || '未命名'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  建立於 {new Date(selectedStudent.created_at).toLocaleString('zh-TW')}
                </div>
              </div>

              {/* 角色內容 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    maxWidth: '900px',
                    margin: '0 auto',
                  }}
                >
                  {selectedStudent.parsed ? (
                    <>
                      {/* Persona 區塊 */}
                      <div>
                        <h3
                          style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: 'var(--text)',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span>📋</span>
                          <span>角色背景</span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {groupedPersona &&
                            Object.entries(groupedPersona).map(([sectionTitle, items]) => {
                              const isCollapsed = collapsedSections.has(sectionTitle);
                              return (
                                <div
                                  key={sectionTitle}
                                  style={{
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    onClick={() => toggleSection(sectionTitle)}
                                    style={{
                                      fontSize: '15px',
                                      fontWeight: '600',
                                      color: '#1e293b',
                                      padding: '16px',
                                      paddingBottom: '12px',
                                      borderBottom: isCollapsed ? 'none' : '2px solid #cbd5e1',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      transition: 'background-color 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#e2e8f0';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <span>{sectionTitle}</span>
                                    <span
                                      style={{
                                        fontSize: '18px',
                                        transition: 'transform 0.2s ease',
                                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                      }}
                                    >
                                      ▼
                                    </span>
                                  </div>
                                  {!isCollapsed && (
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                        padding: '16px',
                                        paddingTop: '12px',
                                      }}
                                    >
                                      {items.map((item, idx) => (
                                        <div key={idx}>
                                          <div
                                            style={{
                                              fontSize: '12px',
                                              fontWeight: '600',
                                              color: '#64748b',
                                              marginBottom: '4px',
                                            }}
                                          >
                                            {item.information_title}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: '14px',
                                              color: '#1e293b',
                                              lineHeight: '1.6',
                                              whiteSpace: 'pre-wrap',
                                            }}
                                          >
                                            {item.information}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Scripts 區塊 */}
                      {selectedStudent.parsed.scripts && selectedStudent.parsed.scripts.length > 0 && (
                        <div>
                          <h3
                            style={{
                              fontSize: '18px',
                              fontWeight: '600',
                              color: 'var(--text)',
                              marginBottom: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <span>💬</span>
                            <span>對話腳本</span>
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {selectedStudent.parsed.scripts
                              .sort((a, b) => a.index - b.index)
                              .map((scriptItem) => (
                                <div
                                  key={scriptItem.index}
                                  style={{
                                    backgroundColor: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    borderRadius: '12px',
                                    padding: '16px',
                                  }}
                                >
                                  <h4
                                    style={{
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      color: '#0c4a6e',
                                      marginBottom: '12px',
                                    }}
                                  >
                                    對話 {scriptItem.index}
                                  </h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {scriptItem.script.map((line, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          fontSize: '14px',
                                          color: '#1e293b',
                                          lineHeight: '1.6',
                                          padding: '8px 12px',
                                          backgroundColor: 'white',
                                          borderRadius: '8px',
                                          border: '1px solid #e0f2fe',
                                        }}
                                      >
                                        {line}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'var(--muted)',
                      }}
                    >
                      <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>無法解析角色資料</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>{selectedIds.size > 1 ? '📦' : '👤'}</div>
                <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
                  {selectedIds.size > 1 ? `已選擇 ${selectedIds.size} 個角色` : '請選擇一個角色'}
                </div>
                <div style={{ fontSize: '14px' }}>
                  {selectedIds.size > 1 ? '可以批次刪除選中的角色' : '從左側列表中選擇角色來查看詳細內容'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右側操作面板 */}
        <div
          style={{
            width: '280px',
            borderLeft: '1px solid var(--border)',
            backgroundColor: 'var(--panel)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              flexShrink: 0,
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>操作面板</h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* 統計資訊 */}
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: 'var(--bg)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--muted)',
                  marginBottom: '8px',
                }}
              >
                資料庫統計
              </div>
              <div
                style={{ fontSize: '14px', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '4px' }}
              >
                <div>總角色數：{students.length}</div>
                <div>已選數量：{selectedIds.size}</div>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => setShowGenerateDialog(true)}
                disabled={generating || deleting}
                className="w-full bg-gradient-to-b from-sky-500 to-sky-600 border border-white/30 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? '生成中...' : '➕ 批次新增角色'}
              </button>

              <button
                onClick={() => handleDelete(Array.from(selectedIds))}
                disabled={selectedIds.size === 0 || deleting || generating}
                className="w-full bg-gradient-to-b from-rose-500 to-rose-600 border border-white/30 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '刪除中...' : `🗑️ 刪除已選 (${selectedIds.size})`}
              </button>
            </div>

            {/* 說明文字 */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#92400e',
                lineHeight: '1.5',
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>💡 使用提示</div>
              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                <li>勾選角色進行多選</li>
                <li>點擊角色查看詳情</li>
                <li>批次新增會詢問數量</li>
                <li>刪除操作無法復原</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 生成對話框 */}
      {showGenerateDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowGenerateDialog(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text)',
                marginBottom: '16px',
              }}
            >
              批次新增學生角色
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="generate-count"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text)',
                }}
              >
                請輸入要生成的數量：
              </label>
              <input
                id="generate-count"
                type="number"
                min="1"
                max="100"
                value={generateCount}
                onChange={(e) => setGenerateCount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowGenerateDialog(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text)',
                  backgroundColor: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  backgroundColor: '#0ea5e9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                確認生成
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

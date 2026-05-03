import { useCallback, useEffect, useState } from 'react'
import { useNovel } from '../contexts/NovelContext'
import {
  listSummariesByNovel,
  createSummary,
  updateSummary,
  deleteSummary,
  generateSummary,
} from '../api/summary'
import { listChaptersByNovel } from '../api/chapter'
import type { Chapter, Summary, CreateSummaryRequest, UpdateSummaryRequest } from '../types'

interface ModalState {
  open: boolean
  editing: Summary | null
}

export default function SummaryPage() {
  const { current } = useNovel()
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<ModalState>({ open: false, editing: null })
  const [saving, setSaving] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formIndex, setFormIndex] = useState(1)
  const [formContent, setFormContent] = useState('')

  // AI generate state
  const [genOpen, setGenOpen] = useState(false)
  const [selectedChapterIds, setSelectedChapterIds] = useState<number[]>([])
  const [genTitle, setGenTitle] = useState('')
  const [generating, setGenerating] = useState(false)

  const fetchSummaries = useCallback(async (novelId: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await listSummariesByNovel(novelId)
      const sorted = [...res.data].sort((a, b) => a.chapterIndex - b.chapterIndex)
      setSummaries(sorted)
    } catch (e: any) {
      setError(e.message || '加载摘要失败')
      setSummaries([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchChapters = useCallback(async (novelId: number) => {
    try {
      const res = await listChaptersByNovel(novelId)
      setChapters([...res.data].sort((a, b) => a.chapterIndex - b.chapterIndex))
    } catch {
      setChapters([])
    }
  }, [])

  useEffect(() => {
    if (current) {
      fetchSummaries(current.id)
      fetchChapters(current.id)
    } else {
      setSummaries([])
      setChapters([])
    }
  }, [current, fetchSummaries, fetchChapters])

  const openCreate = () => {
    setFormTitle('')
    setFormIndex(summaries.length > 0 ? summaries[summaries.length - 1].chapterIndex + 1 : 1)
    setFormContent('')
    setModal({ open: true, editing: null })
  }

  const openEdit = (s: Summary) => {
    setFormTitle(s.title)
    setFormIndex(s.chapterIndex)
    setFormContent(s.content ?? '')
    setModal({ open: true, editing: s })
  }

  const closeModal = () => {
    setModal({ open: false, editing: null })
  }

  const handleSave = async () => {
    if (!formTitle.trim()) return
    if (!current) return
    setSaving(true)
    setError('')
    try {
      if (modal.editing) {
        const data: UpdateSummaryRequest = {
          title: formTitle.trim(),
          chapterIndex: formIndex,
          content: formContent.trim() || undefined,
        }
        await updateSummary(modal.editing.id, data)
      } else {
        const data: CreateSummaryRequest = {
          novelId: current.id,
          title: formTitle.trim(),
          chapterIndex: formIndex,
          content: formContent.trim() || undefined,
        }
        await createSummary(data)
      }
      closeModal()
      await fetchSummaries(current.id)
    } catch (e: any) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条摘要吗？')) return
    setError('')
    try {
      await deleteSummary(id)
      if (current) await fetchSummaries(current.id)
    } catch (e: any) {
      setError(e.message || '删除失败')
    }
  }

  const openGenerate = () => {
    setSelectedChapterIds([])
    setGenTitle('')
    setGenOpen(true)
  }

  const toggleChapter = (id: number) => {
    setSelectedChapterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const selectAllChapters = () => {
    if (selectedChapterIds.length === chapters.length) {
      setSelectedChapterIds([])
    } else {
      setSelectedChapterIds(chapters.map((ch) => ch.id))
    }
  }

  const handleGenerate = async () => {
    if (!current || selectedChapterIds.length === 0) return
    setGenerating(true)
    setError('')
    try {
      await generateSummary({
        novelId: current.id,
        chapterIds: selectedChapterIds,
        title: genTitle.trim() || undefined,
      })
      setGenOpen(false)
      await fetchSummaries(current.id)
    } catch (e: any) {
      setError(e.message || 'AI生成摘要失败')
    } finally {
      setGenerating(false)
    }
  }

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <DocIcon className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">请先在左侧选择一本小说</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">摘要管理 — {current.title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openGenerate}
            disabled={chapters.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-100 disabled:opacity-50"
          >
            <SparklesIcon className="h-4 w-4" />
            AI生成摘要
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            新建摘要
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : summaries.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <DocIcon className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">暂无摘要</p>
          <button
            onClick={openCreate}
            className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            创建第一条摘要
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {summaries.map((s) => (
            <div
              key={s.id}
              className="group flex items-center rounded-lg border border-slate-200 bg-white px-4 py-3 hover:shadow-sm transition-shadow"
            >
              <span className="mr-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-xs font-bold text-indigo-600">
                {s.chapterIndex}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{s.title}</p>
                <p className="mt-0.5 text-xs text-slate-400 truncate">
                  {s.content
                    ? s.content.length > 80
                      ? s.content.slice(0, 80) + '…'
                      : s.content
                    : '暂无内容'}
                  <span className="mx-1.5">·</span>
                  更新于 {formatDate(s.updatedAt)}
                </p>
              </div>
              <div className="ml-4 flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(s)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                  title="编辑"
                >
                  <PenIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  title="删除"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {modal.editing ? '编辑摘要' : '新建摘要'}
            </h2>

            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex-1">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    摘要标题 <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    placeholder="摘要标题"
                  />
                </label>
                <label className="w-28">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    章节序号 <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={formIndex}
                    onChange={(e) => setFormIndex(Number(e.target.value))}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">摘要内容</span>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={6}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  placeholder="记录本章的主要情节、人物发展和关键事件..."
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formTitle.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving && (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {modal.editing ? '保存修改' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !generating && setGenOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-slate-800">AI 生成摘要</h2>
            <p className="mb-4 text-xs text-slate-400">
              勾选多章时，会为每一章各生成一条摘要（如「第2章摘要」「第3章摘要」），不会合并成一条。
            </p>

            <label className="mb-3 block">
              <span className="mb-1 block text-sm font-medium text-slate-700">摘要标题（可选）</span>
              <input
                type="text"
                value={genTitle}
                onChange={(e) => setGenTitle(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="留空则每章为「第N章摘要」；多章时此处作为标题前缀"
              />
            </label>

            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                选择章节（已选 {selectedChapterIds.length}/{chapters.length}）
              </span>
              <button
                onClick={selectAllChapters}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                {selectedChapterIds.length === chapters.length ? '取消全选' : '全选'}
              </button>
            </div>

            <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              {chapters.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">暂无章节，请先创建章节</p>
              ) : (
                chapters.map((ch) => (
                  <label
                    key={ch.id}
                    className={`flex cursor-pointer items-center rounded-md px-3 py-2 transition-colors ${
                      selectedChapterIds.includes(ch.id)
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'bg-white border border-transparent hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedChapterIds.includes(ch.id)}
                      onChange={() => toggleChapter(ch.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200 text-xs font-medium text-slate-600">
                      {ch.chapterIndex}
                    </span>
                    <span className="flex-1 truncate text-sm text-slate-700">{ch.title}</span>
                    <span className="ml-2 shrink-0 text-xs text-slate-400">
                      {ch.content ? `${ch.content.length}字` : '无内容'}
                    </span>
                  </label>
                ))
              )}
            </div>

            {generating && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-600">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                {selectedChapterIds.length > 1
                  ? `正在为所选 ${selectedChapterIds.length} 章依次各生成一条摘要，请稍候…`
                  : 'AI 正在分析章节内容并生成摘要，请稍候…'}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setGenOpen(false)}
                disabled={generating}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || selectedChapterIds.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60 transition-colors"
              >
                {generating ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <SparklesIcon className="h-4 w-4" />
                )}
                {generating ? '生成中...' : '生成摘要'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Utils ── */

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ── Icons ── */

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

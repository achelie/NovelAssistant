import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

export default function SummaryPage() {
  const { current } = useNovel()
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const summaryListScrollRef = useRef<HTMLDivElement | null>(null)

  type OpenState =
    | { mode: 'empty' }
    | { mode: 'create' }
    | { mode: 'edit'; summaryId: number }
    | { mode: 'generate' }
  const [open, setOpen] = useState<OpenState>({ mode: 'empty' })

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [saving, setSaving] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formIndex, setFormIndex] = useState(1)
  const [formContent, setFormContent] = useState('')

  // AI generate state (右侧面板)
  const [selectedChapterIds, setSelectedChapterIds] = useState<number[]>([])
  const [genTitle, setGenTitle] = useState('')
  const [generating, setGenerating] = useState(false)

  const fetchSummaries = useCallback(async (novelId: number) => {
    const prevScrollTop = summaryListScrollRef.current?.scrollTop ?? null
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
      if (prevScrollTop !== null) {
        requestAnimationFrame(() => {
          if (summaryListScrollRef.current) {
            summaryListScrollRef.current.scrollTop = prevScrollTop
          }
        })
      }
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
      setOpen({ mode: 'empty' })
      setSearch('')
      setPage(1)
      setSelectedIds(new Set())
      fetchSummaries(current.id)
      fetchChapters(current.id)
    } else {
      setOpen({ mode: 'empty' })
      setSummaries([])
      setChapters([])
    }
  }, [current, fetchSummaries, fetchChapters])

  const selectedSummaryId = open.mode === 'edit' ? open.summaryId : null
  const selectedSummary = selectedSummaryId ? summaries.find((s) => s.id === selectedSummaryId) : null
  const maxIndex = summaries.length > 0 ? Math.max(...summaries.map((s) => s.chapterIndex)) : 0

  const PAGE_SIZE = 20
  const normalizedSearch = search.trim().toLowerCase()
  const searchIndex = normalizedSearch && /^\d+$/.test(normalizedSearch) ? Number(normalizedSearch) : null
  const filteredSummaries = useMemo(() => {
    if (!normalizedSearch) return summaries
    return summaries.filter((s) => {
      const titleHit = (s.title ?? '').toLowerCase().includes(normalizedSearch)
      const idxHit = searchIndex != null && (s.chapterIndex ?? -1) === searchIndex
      return titleHit || idxHit
    })
  }, [summaries, normalizedSearch, searchIndex])

  const totalPages = Math.max(1, Math.ceil(filteredSummaries.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const pageSummaries = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredSummaries.slice(start, start + PAGE_SIZE)
  }, [filteredSummaries, safePage])

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  useEffect(() => {
    if (open.mode === 'create') {
      setFormTitle('')
      setFormIndex(maxIndex + 1)
      setFormContent('')
      return
    }
    if (open.mode === 'edit') {
      const s = summaries.find((x) => x.id === open.summaryId)
      setFormTitle(s?.title ?? '')
      setFormIndex(s?.chapterIndex ?? 1)
      setFormContent(s?.content ?? '')
      return
    }
    if (open.mode === 'generate') {
      setSelectedChapterIds([])
      setGenTitle('')
    }
  }, [open, summaries, maxIndex])

  const handleSave = async () => {
    if (!formTitle.trim()) return
    if (!current) return
    setSaving(true)
    setError('')
    try {
      if (open.mode === 'edit' && selectedSummary) {
        const data: UpdateSummaryRequest = {
          title: formTitle.trim(),
          chapterIndex: formIndex,
          content: formContent.trim() || undefined,
        }
        await updateSummary(selectedSummary.id, data)
      } else if (open.mode === 'create') {
        const data: CreateSummaryRequest = {
          novelId: current.id,
          title: formTitle.trim(),
          chapterIndex: formIndex,
          content: formContent.trim() || undefined,
        }
        await createSummary(data)
      }
      await fetchSummaries(current.id)
      setOpen({ mode: 'empty' })
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
      if (open.mode === 'edit' && open.summaryId === id) {
        setOpen({ mode: 'empty' })
      }
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (e: any) {
      setError(e.message || '删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定要删除已选的 ${selectedIds.size} 条摘要吗？`)) return
    setError('')
    try {
      for (const id of selectedIds) {
        await deleteSummary(id)
      }
      setSelectedIds(new Set())
      if (current) await fetchSummaries(current.id)
      if (open.mode === 'edit' && selectedSummaryId && selectedIds.has(selectedSummaryId)) {
        setOpen({ mode: 'empty' })
      }
    } catch (e: any) {
      setError(e.message || '批量删除失败')
    }
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
      await fetchSummaries(current.id)
      setOpen({ mode: 'empty' })
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
    <div className="flex h-full flex-col overflow-hidden">
      {error && (
        <div className="mx-6 mt-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            &times;
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col md:flex-row">
          {/* Left: summary list */}
          <div
            className={[
              'flex h-full shrink-0 flex-col border-slate-200 bg-white md:w-[360px] md:border-r',
              open.mode !== 'empty' ? 'hidden md:block' : 'block',
            ].join(' ')}
          >
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-semibold text-slate-800">
                    摘要 — {current.title}
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {summaries.length.toLocaleString()} 条
                    {normalizedSearch ? ` · 匹配 ${filteredSummaries.length.toLocaleString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <button
                    onClick={() => setOpen({ mode: 'generate' })}
                    disabled={chapters.length === 0}
                    className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-100 disabled:opacity-50"
                    title="AI生成摘要"
                  >
                    AI生成
                  </button>
                  <button
                    onClick={() => setOpen({ mode: 'create' })}
                    className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                    title="新建摘要"
                  >
                    新建
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="搜索标题或章节序号（如 12）"
                />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  已选 <span className="font-medium text-slate-700">{selectedIds.size}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev)
                        for (const s of pageSummaries) next.add(s.id)
                        return next
                      })
                    }}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    本页全选
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    disabled={selectedIds.size === 0}
                  >
                    清空
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchDelete}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
                    disabled={selectedIds.size === 0}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>

            <div ref={summaryListScrollRef} className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              ) : filteredSummaries.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <DocIcon className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-400">
                    {normalizedSearch ? '没有匹配的摘要' : '暂无摘要'}
                  </p>
                  {!normalizedSearch && (
                    <button
                      onClick={() => setOpen({ mode: 'create' })}
                      className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      创建第一条摘要
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-2">
                  {pageSummaries.map((s) => {
                    const active = open.mode === 'edit' && open.summaryId === s.id
                    const checked = selectedIds.has(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setOpen({ mode: 'edit', summaryId: s.id })}
                        className={[
                          'w-full rounded-lg text-left',
                          active ? 'bg-indigo-50' : 'hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-3 px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextChecked = e.target.checked
                              setSelectedIds((prev) => {
                                const next = new Set(prev)
                                if (nextChecked) next.add(s.id)
                                else next.delete(s.id)
                                return next
                              })
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            aria-label={`选择摘要 ${s.title}`}
                          />
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-500">
                            {s.chapterIndex ?? '-'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">{s.title}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {s.content
                                ? s.content.length > 80
                                  ? s.content.slice(0, 80) + '…'
                                  : s.content
                                : '无内容'}{' '}
                              · {formatDate(s.updatedAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <span
                              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDelete(s.id)
                              }}
                              title="删除"
                              role="button"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="-mt-1 border-t border-slate-200 bg-white px-3 py-1.5">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  第 <span className="font-medium text-slate-700">{safePage}</span> / {totalPages} 页
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    下一页
                  </button>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const fd = new FormData(e.currentTarget)
                      const raw = String(fd.get('page') ?? '').trim()
                      const n = Number(raw)
                      if (!Number.isFinite(n)) return
                      const target = Math.min(Math.max(1, Math.floor(n)), totalPages)
                      setPage(target)
                      ;(e.currentTarget as HTMLFormElement).reset()
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      name="page"
                      inputMode="numeric"
                      className="w-14 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="页码"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      跳转
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Right: editor */}
          <div
            className={[
              'flex-1 overflow-hidden bg-slate-50',
              open.mode === 'empty' ? 'hidden md:block' : 'block',
            ].join(' ')}
          >
            <div className="h-full overflow-y-auto">
              {open.mode === 'empty' ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <DocIcon className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-400">在左侧选择一条摘要开始编辑</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOpen({ mode: 'empty' })}
                        className="md:hidden rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        aria-label="返回摘要列表"
                      >
                        返回
                      </button>
                      <h2 className="min-w-0 truncate text-sm font-semibold text-slate-700">
                        {open.mode === 'generate'
                          ? 'AI生成摘要'
                          : open.mode === 'edit'
                            ? '摘要编辑'
                            : '新建摘要'}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {open.mode === 'edit' && selectedSummary ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedSummary.id)}
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          删除
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setOpen({ mode: 'empty' })}
                        disabled={saving || generating}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                      >
                        关闭
                      </button>
                      {open.mode !== 'generate' ? (
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving || !formTitle.trim()}
                          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {saving && (
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          )}
                          保存
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGenerate}
                          disabled={generating || selectedChapterIds.length === 0}
                          className="flex items-center gap-1.5 rounded-md bg-purple-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
                        >
                          {generating ? (
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <SparklesIcon className="h-4 w-4" />
                          )}
                          {generating ? '生成中...' : '生成'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {open.mode === 'generate' ? (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <p className="text-xs text-slate-500">
                            勾选多章时，会为每一章各生成一条摘要（如「第2章摘要」「第3章摘要」），不会合并成一条。
                          </p>
                        </div>

                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            摘要标题（可选）
                          </span>
                          <input
                            type="text"
                            value={genTitle}
                            onChange={(e) => setGenTitle(e.target.value)}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="留空则每章为「第N章摘要」；多章时此处作为标题前缀"
                          />
                        </label>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">
                            选择章节（已选 {selectedChapterIds.length}/{chapters.length}）
                          </span>
                          <button
                            onClick={selectAllChapters}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                            type="button"
                          >
                            {selectedChapterIds.length === chapters.length ? '取消全选' : '全选'}
                          </button>
                        </div>

                        <div className="max-h-[420px] space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                          {chapters.length === 0 ? (
                            <p className="py-4 text-center text-sm text-slate-400">
                              暂无章节，请先创建章节
                            </p>
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
                              </label>
                            ))
                          )}
                        </div>

                        {generating && (
                          <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-600">
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                            {selectedChapterIds.length > 1
                              ? `正在为所选 ${selectedChapterIds.length} 章依次各生成一条摘要，请稍候…`
                              : 'AI 正在分析章节内容并生成摘要，请稍候…'}
                          </div>
                        )}
                      </div>
                    ) : (
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
                              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </label>
                        </div>

                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            摘要内容
                          </span>
                          <textarea
                            value={formContent}
                            onChange={(e) => setFormContent(e.target.value)}
                            rows={14}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed resize-none focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="记录本章的主要情节、人物发展和关键事件..."
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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

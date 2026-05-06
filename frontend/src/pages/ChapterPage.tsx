import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNovel } from '../contexts/NovelContext'
import {
  listChaptersByNovel,
  createChapter,
  getChapter,
  updateChapter,
  deleteChapter,
} from '../api/chapter'
import type { Chapter, CreateChapterRequest, UpdateChapterRequest } from '../types'
import { ChapterRichEditor, type ChapterRichEditorChange } from '../components/chapter/ChapterRichEditor'
import {
  chapterContentToPlainText,
  isProseMirrorJsonString,
  plainTextToMinimalDoc,
} from '../utils/chapterContent'

type OpenState =
  | { mode: 'empty' }
  | { mode: 'create' }
  | { mode: 'edit'; chapterId: number }

export default function ChapterPage() {
  const { current } = useNovel()
  const { user } = useAuth()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(false)
  const chapterListScrollRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState<OpenState>({ mode: 'empty' })
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())

  const fetchChapters = useCallback(async (novelId: number) => {
    const prevScrollTop = chapterListScrollRef.current?.scrollTop ?? null
    setLoading(true)
    try {
      const res = await listChaptersByNovel(novelId)
      setChapters(
        [...res.data].sort((a, b) => a.chapterIndex - b.chapterIndex),
      )
    } catch (e: any) {
      setError(e.message ?? '加载章节失败')
      setChapters([])
    } finally {
      setLoading(false)
      // 避免刷新列表导致左侧滚动位置“上下抽搐/跳回顶部”
      if (prevScrollTop !== null) {
        requestAnimationFrame(() => {
          if (chapterListScrollRef.current) {
            chapterListScrollRef.current.scrollTop = prevScrollTop
          }
        })
      }
    }
  }, [])

  useEffect(() => {
    setOpen({ mode: 'empty' })
    setSearch('')
    setPage(1)
    setSelectedIds(new Set())
    if (current) {
      fetchChapters(current.id)
    } else {
      setChapters([])
    }
  }, [current, fetchChapters])

  const handleDeleteChapter = async (id: number) => {
    if (!confirm('确定要删除这个章节吗？')) return
    try {
      await deleteChapter(id)
      if (current) fetchChapters(current.id)
      if (open.mode === 'edit' && open.chapterId === id) {
        setOpen({ mode: 'empty' })
      }
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (e: any) {
      setError(e.message ?? '删除失败')
    }
  }

  const handleSave = async (payload: {
    mode: 'create' | 'edit'
    chapterId?: number
    title: string
    content: string
    chapterIndex: number
  }) => {
    if (payload.mode === 'create' && current) {
      const req: CreateChapterRequest = {
        novelId: current.id,
        title: payload.title,
        content: payload.content,
        chapterIndex: payload.chapterIndex,
      }
      const res = await createChapter(req)
      const created = res.data
      await fetchChapters(current.id)
      setOpen({ mode: 'edit', chapterId: created.id })
      return
    }
    if (payload.mode === 'edit' && payload.chapterId) {
      const req: UpdateChapterRequest = {
        title: payload.title,
        content: payload.content,
        chapterIndex: payload.chapterIndex,
      }
      await updateChapter(payload.chapterId, req)
    }
    if (current) fetchChapters(current.id)
  }

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <BookIcon className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">请先在左侧选择一本小说</p>
        </div>
      </div>
    )
  }

  const handleUploadDone = () => {
    setOpen({ mode: 'empty' })
    if (current) fetchChapters(current.id)
  }

  const [showUploader, setShowUploader] = useState(false)
  if (showUploader) {
    return (
      <TxtUploader
        novelId={current.id}
        startIndex={chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapterIndex)) + 1 : 1}
        onDone={handleUploadDone}
        onCancel={() => setShowUploader(false)}
      />
    )
  }

  const selectedId = open.mode === 'edit' ? open.chapterId : null
  const selectedChapter = selectedId ? chapters.find((c) => c.id === selectedId) : null
  const maxIndex = chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapterIndex)) : 0

  const PAGE_SIZE = 15
  const normalizedSearch = search.trim().toLowerCase()
  const searchIndex =
    normalizedSearch && /^\d+$/.test(normalizedSearch) ? Number(normalizedSearch) : null

  const filteredChapters = useMemo(() => {
    if (!normalizedSearch) return chapters
    return chapters.filter((ch) => {
      const titleHit = (ch.title ?? '').toLowerCase().includes(normalizedSearch)
      const idxHit = searchIndex != null && (ch.chapterIndex ?? -1) === searchIndex
      return titleHit || idxHit
    })
  }, [chapters, normalizedSearch, searchIndex])

  const totalPages = Math.max(1, Math.ceil(filteredChapters.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const pageChapters = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredChapters.slice(start, start + PAGE_SIZE)
  }, [filteredChapters, safePage])

  useEffect(() => {
    // 搜索或过滤结果变化时，确保页码合法；搜索变化时回到第一页
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

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
        <div className="flex h-full">
          {/* Left: chapter list */}
          <div className="w-[360px] shrink-0 border-r border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-semibold text-slate-800">
                    章节 — {current.title}
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {chapters.length.toLocaleString()} 章
                    {normalizedSearch ? ` · 匹配 ${filteredChapters.length.toLocaleString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowUploader(true)}
                    className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    title="上传TXT"
                  >
                    上传
                  </button>
                  <button
                    onClick={() => {
                      setOpen({ mode: 'create' })
                    }}
                    className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                    title="新建章节"
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
                        for (const ch of pageChapters) next.add(ch.id)
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
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    disabled={selectedIds.size === 0}
                  >
                    清空
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (selectedIds.size === 0) return
                      if (!confirm(`确定要删除已选的 ${selectedIds.size} 个章节吗？此操作不可撤销。`)) {
                        return
                      }
                      const ids = Array.from(selectedIds)
                      try {
                        for (const id of ids) {
                          await deleteChapter(id)
                        }
                        setSelectedIds(new Set())
                        if (open.mode === 'edit' && ids.includes(open.chapterId)) {
                          setOpen({ mode: 'empty' })
                        }
                        if (current) await fetchChapters(current.id)
                      } catch (e: any) {
                        setError(e.message ?? '批量删除失败')
                      }
                    }}
                    className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
                    disabled={selectedIds.size === 0}
                  >
                    批量删除
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={chapterListScrollRef}
              className="relative h-[calc(100%-180px)] overflow-y-auto p-2"
            >
              {chapters.length > 0 && (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-2 pt-2">
                  <div
                    className={[
                      'inline-flex rounded-md bg-white/80 px-2 py-1 text-xs text-slate-400 shadow-sm backdrop-blur transition-opacity',
                      loading ? 'opacity-100' : 'opacity-0',
                    ].join(' ')}
                    aria-live="polite"
                  >
                    正在刷新章节列表…
                  </div>
                </div>
              )}
              {chapters.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <FileIcon className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-400">暂无章节</p>
                  <button
                    onClick={() => setOpen({ mode: 'create' })}
                    className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    创建第一个章节
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {pageChapters.map((ch) => {
                    const isActive = open.mode === 'edit' && open.chapterId === ch.id
                    const isChecked = selectedIds.has(ch.id)
                    return (
                      <button
                        type="button"
                        key={ch.id}
                        onClick={async () => {
                          setOpen({ mode: 'edit', chapterId: ch.id })
                          // 尝试拉取最新内容（避免列表里内容不全/过旧）
                          try {
                            const res = await getChapter(ch.id)
                            const full = res.data
                            setChapters((prev) =>
                              prev.map((p) => (p.id === ch.id ? { ...p, ...full } : p)),
                            )
                          } catch {
                            // ignore
                          }
                        }}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          isActive
                            ? 'border-indigo-200 bg-indigo-50'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setSelectedIds((prev) => {
                                const next = new Set(prev)
                                if (checked) next.add(ch.id)
                                else next.delete(ch.id)
                                return next
                              })
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            aria-label={`选择章节 ${ch.title}`}
                          />
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-500">
                            {ch.chapterIndex ?? '-'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">{ch.title}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              {ch.content
                                ? `${chapterContentToPlainText(ch.content).length.toLocaleString()} 字`
                                : '无内容'}{' '}
                              · {formatDate(ch.updatedAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <span
                              className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteChapter(ch.id)
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
            <div className="border-t border-slate-200 bg-white px-3 py-2">
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
          <div className="flex-1 overflow-hidden bg-slate-50">
            <div className="h-full overflow-y-auto">
              {open.mode === 'empty' ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <BookIcon className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-400">在左侧选择一个章节开始编辑</p>
                  </div>
                </div>
              ) : (
                <ChapterEditorPane
                  mode={open.mode}
                  chapter={selectedChapter ?? null}
                  userId={user?.userId}
                  defaultChapterIndex={maxIndex + 1}
                  onSave={handleSave}
                  onSavedRefresh={() => {
                    if (current) fetchChapters(current.id)
                  }}
                  onCloseCreate={() => setOpen({ mode: 'empty' })}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── TXT Uploader ── */

interface ParsedChapter {
  title: string
  content: string
  chapterIndex: number
}

const CHAPTER_RE = /^(第[一二三四五六七八九十百千万零〇\d]+章[^\n]*)/gm

function parseTxtToChapters(
  filename: string,
  text: string,
  autoSplit: boolean,
  startIndex: number,
): ParsedChapter[] {
  if (!autoSplit) {
    return [
      {
        title: filename.replace(/\.txt$/i, ''),
        content: text.trim(),
        chapterIndex: startIndex,
      },
    ]
  }

  const matches: { index: number; title: string }[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(CHAPTER_RE.source, 'gm')
  while ((m = re.exec(text)) !== null) {
    matches.push({ index: m.index, title: m[1].trim() })
  }

  if (matches.length <= 1) {
    const title = matches.length === 1 ? matches[0].title : filename.replace(/\.txt$/i, '')
    const content = matches.length === 1
      ? text.substring(matches[0].index + matches[0].title.length).trim()
      : text.trim()
    return [{ title, content, chapterIndex: startIndex }]
  }

  return matches.map((match, i) => {
    const contentStart = match.index + match.title.length
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index : text.length
    return {
      title: match.title,
      content: text.substring(contentStart, contentEnd).trim(),
      chapterIndex: startIndex + i,
    }
  })
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`读取文件 ${file.name} 失败`))
    reader.readAsText(file, 'UTF-8')
  })
}

function TxtUploader({
  novelId,
  startIndex,
  onDone,
  onCancel,
}: {
  novelId: number
  startIndex: number
  onDone: () => void
  onCancel: () => void
}) {
  const [parsedChapters, setParsedChapters] = useState<ParsedChapter[]>([])
  const [autoSplit, setAutoSplit] = useState(true)
  const [rawFiles, setRawFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const parseFiles = useCallback(
    async (files: File[], split: boolean) => {
      try {
        const all: ParsedChapter[] = []
        let idx = startIndex
        for (const file of files) {
          const text = await readFileAsText(file)
          const chapters = parseTxtToChapters(file.name, text, split, idx)
          all.push(...chapters)
          idx += chapters.length
        }
        setParsedChapters(all)
        setError('')
      } catch (e: any) {
        setError(e.message ?? '解析文件失败')
        setParsedChapters([])
      }
    },
    [startIndex],
  )

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      const txtFiles = Array.from(fileList).filter((f) =>
        f.name.toLowerCase().endsWith('.txt'),
      )
      if (txtFiles.length === 0) {
        setError('请选择 .txt 文件')
        return
      }
      setRawFiles(txtFiles)
      parseFiles(txtFiles, autoSplit)
    },
    [autoSplit, parseFiles],
  )

  useEffect(() => {
    if (rawFiles.length > 0) {
      parseFiles(rawFiles, autoSplit)
    }
  }, [autoSplit, rawFiles, parseFiles])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleUpload = async () => {
    if (parsedChapters.length === 0) return
    setUploading(true)
    setProgress({ done: 0, total: parsedChapters.length })
    setError('')
    try {
      for (let i = 0; i < parsedChapters.length; i++) {
        const ch = parsedChapters[i]
        await createChapter({
          novelId,
          title: ch.title,
          content: JSON.stringify(plainTextToMinimalDoc(ch.content)),
          chapterIndex: ch.chapterIndex,
        })
        setProgress({ done: i + 1, total: parsedChapters.length })
      }
      onDone()
    } catch (e: any) {
      setError(e.message ?? '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const totalWords = parsedChapters.reduce((sum, ch) => sum + ch.content.length, 0)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <h2 className="text-sm font-semibold text-slate-700">上传 TXT 文件</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={uploading}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || parsedChapters.length === 0}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {uploading && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {uploading
              ? `上传中 ${progress.done}/${progress.total}`
              : `上传 ${parsedChapters.length} 个章节`}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            &times;
          </button>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition-colors ${
            dragOver
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
          }`}
        >
          <UploadIcon className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            拖拽 TXT 文件到此处，或{' '}
            <label className="cursor-pointer font-medium text-indigo-600 hover:text-indigo-700">
              点击选择文件
              <input
                type="file"
                accept=".txt"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </p>
          <p className="mt-1 text-xs text-slate-400">支持选择多个 .txt 文件</p>
        </div>

        {/* Auto-split toggle */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={autoSplit}
            onChange={(e) => setAutoSplit(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>智能分章</span>
          <span className="text-xs text-slate-400">（自动按"第X章"标记分割单个文件为多章节）</span>
        </label>

        {/* File list */}
        {rawFiles.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileIcon className="h-4 w-4" />
            已选择 {rawFiles.length} 个文件
            <button
              onClick={() => { setRawFiles([]); setParsedChapters([]) }}
              className="ml-1 text-red-400 hover:text-red-500"
            >
              清除
            </button>
          </div>
        )}

        {/* Preview */}
        {parsedChapters.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">
                解析结果预览（共 {parsedChapters.length} 章，{totalWords.toLocaleString()} 字）
              </h3>
            </div>
            <div className="max-h-[400px] space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
              {parsedChapters.map((ch, i) => (
                <div
                  key={i}
                  className="flex items-center rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-100 text-xs font-medium text-indigo-600">
                    {ch.chapterIndex}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{ch.title}</p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs text-slate-400">
                    {ch.content.length.toLocaleString()} 字
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload progress bar */}
        {uploading && (
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-right text-xs text-slate-400">
              {progress.done} / {progress.total}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Chapter Editor ── */

function ChapterEditorPane({
  mode,
  chapter,
  userId,
  defaultChapterIndex,
  onSave,
  onSavedRefresh,
  onCloseCreate,
}: {
  mode: OpenState['mode']
  chapter: Chapter | null
  userId?: number
  defaultChapterIndex: number
  onSave: (payload: {
    mode: 'create' | 'edit'
    chapterId?: number
    title: string
    content: string
    chapterIndex: number
  }) => Promise<void>
  onSavedRefresh: () => void
  onCloseCreate: () => void
}) {
  const isEdit = mode === 'edit'
  const chapterId = isEdit ? chapter?.id ?? null : null
  const draftKey = useMemo(() => {
    if (!userId) return null
    if (!isEdit) return `novel_assistant_chapter_draft:${userId}:new`
    return chapterId ? `novel_assistant_chapter_draft:${userId}:${chapterId}` : null
  }, [chapterId, isEdit, userId])

  type Draft = { title: string; chapterIndex: number; content: string; updatedAt: number }

  const baseContentRaw = isEdit ? (chapter?.content ?? '') : ''
  const basePlainText = useMemo(() => chapterContentToPlainText(baseContentRaw), [baseContentRaw])
  const baseJsonString = useMemo(() => {
    const raw = (baseContentRaw ?? '').trim()
    if (!raw) return JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })
    if (isProseMirrorJsonString(raw)) return raw
    return JSON.stringify(plainTextToMinimalDoc(raw))
  }, [baseContentRaw])

  const [title, setTitle] = useState(isEdit ? (chapter?.title ?? '') : '')
  const [contentJsonString, setContentJsonString] = useState(baseJsonString)
  const [plainText, setPlainText] = useState(basePlainText)
  const [chapterIndex, setChapterIndex] = useState(
    isEdit ? (chapter?.chapterIndex ?? 1) : defaultChapterIndex,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [draftExists, setDraftExists] = useState(false)

  const draftWriteTimerRef = useRef<number | null>(null)
  const autoSaveTimerRef = useRef<number | null>(null)

  const persistDraft = useCallback(
    (payload: Draft) => {
      if (!draftKey) return
      try {
        localStorage.setItem(draftKey, JSON.stringify(payload))
        setDraftExists(true)
      } catch {
        // ignore quota errors
      }
    },
    [draftKey],
  )

  // 同步写入草稿（用于“允许切换章节但不丢稿”的卸载兜底）
  const persistDraftSync = useCallback(
    (payload: Draft) => {
      if (!draftKey) return
      try {
        localStorage.setItem(draftKey, JSON.stringify(payload))
        setDraftExists(true)
      } catch {
        // ignore quota errors
      }
    },
    [draftKey],
  )

  // reset when switching between chapters/modes
  useEffect(() => {
    setTitle(isEdit ? (chapter?.title ?? '') : '')
    setChapterIndex(isEdit ? (chapter?.chapterIndex ?? 1) : defaultChapterIndex)
    setContentJsonString(baseJsonString)
    setPlainText(basePlainText)
    setDirty(false)
    setSaveStatus('idle')
    setError('')
    setDraftExists(false)
  }, [baseJsonString, basePlainText, chapter?.chapterIndex, chapter?.title, defaultChapterIndex, isEdit])

  // restore draft on enter
  useEffect(() => {
    if (!draftKey) return
    // React StrictMode(dev) 下 effect 可能触发两次；避免重复恢复导致“弹两次/状态抖动”
    // 这里我们改为静默恢复，因此主要是避免重复 setState。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const didRestoreDraftRef = useRef(false)

  useEffect(() => {
    if (!draftKey) return
    if (didRestoreDraftRef.current) return
    didRestoreDraftRef.current = true
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as Draft
      if (!parsed || typeof parsed !== 'object') return
      if (typeof parsed.updatedAt !== 'number') return

      if (isEdit) {
        const chapterUpdatedAt = Date.parse(chapter?.updatedAt ?? '')
        if (!Number.isFinite(chapterUpdatedAt)) return
        if (parsed.updatedAt <= chapterUpdatedAt) return
      }

      // 默认静默恢复：仅当草稿内容确实不同才覆盖并标记为 dirty，避免“啥也没改一切换就提示/标脏”
      const nextTitle = typeof parsed.title === 'string' ? parsed.title : title
      const nextIndex = typeof parsed.chapterIndex === 'number' ? parsed.chapterIndex : chapterIndex
      const nextContent = typeof parsed.content === 'string' ? parsed.content : contentJsonString

      const differs =
        nextTitle !== title || nextIndex !== chapterIndex || nextContent !== contentJsonString

      if (differs) {
        setTitle(nextTitle)
        setChapterIndex(nextIndex)
        setContentJsonString(nextContent)
        setDraftExists(true)
        setDirty(true)
        setSaveStatus('unsaved')
      } else {
        // 草稿与当前一致：只记录草稿存在即可，不标脏
        setDraftExists(true)
      }
    } catch {
      // ignore broken drafts
    }
  }, [chapter?.updatedAt, chapterIndex, contentJsonString, draftKey, isEdit, title])

  const handleEditorChange = useCallback((payload: ChapterRichEditorChange) => {
    setContentJsonString(payload.jsonString)
    setPlainText(payload.plainText)
    setDirty(true)
    setSaveStatus('unsaved')
  }, [])

  const touchDirty = useCallback(() => {
    setDirty(true)
    setSaveStatus('unsaved')
  }, [])

  // draft write (create + edit)
  useEffect(() => {
    if (!draftKey) return
    if (draftWriteTimerRef.current) window.clearTimeout(draftWriteTimerRef.current)

    draftWriteTimerRef.current = window.setTimeout(() => {
      persistDraft({
        title,
        chapterIndex,
        content: contentJsonString,
        updatedAt: Date.now(),
      })
    }, 500)

    return () => {
      if (draftWriteTimerRef.current) window.clearTimeout(draftWriteTimerRef.current)
    }
  }, [chapterIndex, contentJsonString, draftKey, persistDraft, title])

  // auto save (edit only)
  useEffect(() => {
    if (!isEdit) return
    if (!dirty) return
    if (!chapterId) return

    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = window.setTimeout(async () => {
      const t = title.trim()
      const hasText = plainText.trim().length > 0
      if (!t || !hasText) return

      setSaveStatus('saving')
      try {
        const req: UpdateChapterRequest = {
          title: t,
          content: contentJsonString,
          chapterIndex,
        }
        await updateChapter(chapterId, req)
        setDirty(false)
        setSaveStatus('saved')

        // keep draft synced (or can be cleared; we choose to keep it updated)
        persistDraft({
          title: t,
          chapterIndex,
          content: contentJsonString,
          updatedAt: Date.now(),
        })
      } catch {
        setSaveStatus('error')
        setError('自动保存失败，请检查网络或点击“保存”重试')
      }
    }, 2500)

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
    }
  }, [chapterId, chapterIndex, contentJsonString, dirty, isEdit, persistDraft, plainText, title])

  // 允许直接切换章节（A）：卸载时把当前变更写入草稿，并触发一次后台保存快照（不阻塞切换）
  const leavingSnapshotRef = useRef<{
    chapterId: number | null
    dirty: boolean
    title: string
    chapterIndex: number
    contentJsonString: string
    plainText: string
  } | null>(null)

  useEffect(() => {
    leavingSnapshotRef.current = isEdit
      ? { chapterId, dirty, title, chapterIndex, contentJsonString, plainText }
      : null
  }, [chapterId, chapterIndex, contentJsonString, dirty, isEdit, plainText, title])

  useEffect(() => {
    return () => {
      const snap = leavingSnapshotRef.current
      if (!snap || !snap.chapterId || !snap.dirty) return

      persistDraftSync({
        title: snap.title,
        chapterIndex: snap.chapterIndex,
        content: snap.contentJsonString,
        updatedAt: Date.now(),
      })

      const t = snap.title.trim()
      const hasText = snap.plainText.trim().length > 0
      if (!t || !hasText) return

      updateChapter(snap.chapterId, {
        title: t,
        content: snap.contentJsonString,
        chapterIndex: snap.chapterIndex,
      })
        .then(() => {
          onSavedRefresh()
        })
        .catch(() => {
          // ignore; draft is preserved
        })
    }
  }, [onSavedRefresh, persistDraftSync])

  // beforeunload warning
  useEffect(() => {
    const shouldWarn = dirty || (!isEdit && draftExists)
    if (!shouldWarn) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, draftExists, isEdit])

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('章节标题不能为空')
      return
    }
    if (plainText.trim().length === 0) {
      setError('章节内容不能为空')
      return
    }
    setError('')
    setSaving(true)
    try {
      setSaveStatus('saving')
      const t = title.trim()
      await onSave({
        mode: isEdit ? 'edit' : 'create',
        chapterId: chapterId ?? undefined,
        title: t,
        content: contentJsonString,
        chapterIndex,
      })
      setDirty(false)
      setSaveStatus('saved')
      onSavedRefresh()

      if (draftKey && !isEdit) {
        localStorage.removeItem(draftKey)
        setDraftExists(false)
        onCloseCreate()
      } else if (draftKey) {
        persistDraft({
          title: t,
          chapterIndex,
          content: contentJsonString,
          updatedAt: Date.now(),
        })
      }
    } catch (e: any) {
      setError(e.message || '保存失败')
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleRetrySave = useCallback(async () => {
    if (!isEdit || !chapterId) return
    const t = title.trim()
    const hasText = plainText.trim().length > 0
    if (!t || !hasText) return

    setError('')
    setSaveStatus('saving')
    try {
      const req: UpdateChapterRequest = {
        title: t,
        content: contentJsonString,
        chapterIndex,
      }
      await updateChapter(chapterId, req)
      setDirty(false)
      setSaveStatus('saved')
      persistDraft({
        title: t,
        chapterIndex,
        content: contentJsonString,
        updatedAt: Date.now(),
      })
    } catch {
      setSaveStatus('error')
      setError('保存失败，请检查网络后重试')
    }
  }, [chapterId, chapterIndex, contentJsonString, isEdit, persistDraft, plainText, title])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <h2 className="text-sm font-semibold text-slate-700">
          {isEdit ? '章节编辑' : '新建章节'}
        </h2>
        <div className="flex items-center gap-2">
          {!isEdit && (
            <button
              onClick={onCloseCreate}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              关闭
            </button>
          )}
          {isEdit && saveStatus === 'error' && (
            <button
              onClick={handleRetrySave}
              disabled={saving}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
            >
              重试保存
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            保存
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex gap-4">
          <label className="flex-1">
            <span className="mb-1 block text-sm font-medium text-slate-700">章节标题</span>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                touchDirty()
              }}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="第X章 标题"
            />
          </label>
          <label className="w-28">
            <span className="mb-1 block text-sm font-medium text-slate-700">章节序号</span>
            <input
              type="number"
              min={1}
              value={chapterIndex}
              onChange={(e) => {
                setChapterIndex(Number(e.target.value))
                touchDirty()
              }}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
        </div>

        <label className="flex flex-1 flex-col">
          <span className="mb-1 block text-sm font-medium text-slate-700">章节内容</span>
          <ChapterRichEditor
            initialContent={contentJsonString}
            onChange={handleEditorChange}
            className="min-h-[400px]"
          />
          <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
            <span>
              {saveStatus === 'saving'
                ? '保存中...'
                : saveStatus === 'saved'
                  ? '已保存'
                  : saveStatus === 'error'
                    ? '保存失败'
                    : dirty
                      ? '未保存'
                      : '已保存'}
            </span>
            <span>{plainText.length.toLocaleString()} 字</span>
          </div>
        </label>
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

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

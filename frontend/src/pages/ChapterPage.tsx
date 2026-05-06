import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNovel } from '../contexts/NovelContext'
import {
  listChaptersByNovel,
  createChapter,
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

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; chapter: Chapter }
  | { mode: 'upload' }

export default function ChapterPage() {
  const { current } = useNovel()
  const { user } = useAuth()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(false)
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })
  const [error, setError] = useState('')

  const fetchChapters = useCallback(async (novelId: number) => {
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
    }
  }, [])

  useEffect(() => {
    setEditor({ mode: 'closed' })
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
      if (editor.mode === 'edit' && editor.chapter.id === id) {
        setEditor({ mode: 'closed' })
      }
    } catch (e: any) {
      setError(e.message ?? '删除失败')
    }
  }

  const handleSave = async (title: string, content: string, chapterIndex: number) => {
    if (editor.mode === 'create' && current) {
      const req: CreateChapterRequest = {
        novelId: current.id,
        title,
        content,
        chapterIndex,
      }
      await createChapter(req)
    } else if (editor.mode === 'edit') {
      const req: UpdateChapterRequest = { title, content, chapterIndex }
      await updateChapter(editor.chapter.id, req)
    }
    setEditor({ mode: 'closed' })
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
    setEditor({ mode: 'closed' })
    if (current) fetchChapters(current.id)
  }

  if (editor.mode === 'upload') {
    return (
      <TxtUploader
        novelId={current.id}
        startIndex={chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapterIndex)) + 1 : 1}
        onDone={handleUploadDone}
        onCancel={() => setEditor({ mode: 'closed' })}
      />
    )
  }

  if (editor.mode !== 'closed') {
    return (
      <ChapterEditor
        state={editor}
        userId={user?.userId}
        onSave={handleSave}
        onCancel={() => setEditor({ mode: 'closed' })}
      />
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

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">
            章节管理 — {current.title}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditor({ mode: 'upload' })}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
            >
              <UploadIcon className="h-4 w-4" />
              上传TXT
            </button>
            <button
              onClick={() => setEditor({ mode: 'create' })}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4" />
              新建章节
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : chapters.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
            <FileIcon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-400">暂无章节，创建第一个章节</p>
            <button
              onClick={() => setEditor({ mode: 'create' })}
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              创建第一个章节
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className="group flex items-center rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
              >
                <span className="mr-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-500">
                  {ch.chapterIndex ?? '-'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{ch.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {ch.content
                      ? `${chapterContentToPlainText(ch.content).length.toLocaleString()} 字`
                      : '无内容'}{' '}
                    · 更新于{' '}
                    {formatDate(ch.updatedAt)}
                  </p>
                </div>
                <div className="ml-4 flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setEditor({ mode: 'edit', chapter: ch })}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                    title="编辑"
                  >
                    <PenIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteChapter(ch.id)}
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

function ChapterEditor({
  state,
  userId,
  onSave,
  onCancel,
}: {
  state: Extract<EditorState, { mode: 'create' } | { mode: 'edit' }>
  userId?: number
  onSave: (title: string, content: string, chapterIndex: number) => Promise<void>
  onCancel: () => void
}) {
  const isEdit = state.mode === 'edit'
  const draftKey = useMemo(() => {
    if (!userId) return null
    if (!isEdit) return `novel_assistant_chapter_draft:${userId}:new`
    return `novel_assistant_chapter_draft:${userId}:${state.chapter.id}`
  }, [isEdit, state, userId])

  type Draft = { title: string; chapterIndex: number; content: string; updatedAt: number }

  const baseContentRaw = isEdit ? (state.chapter.content ?? '') : ''
  const basePlainText = useMemo(() => chapterContentToPlainText(baseContentRaw), [baseContentRaw])
  const baseJsonString = useMemo(() => {
    const raw = (baseContentRaw ?? '').trim()
    if (!raw) return JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })
    if (isProseMirrorJsonString(raw)) return raw
    return JSON.stringify(plainTextToMinimalDoc(raw))
  }, [baseContentRaw])

  const [title, setTitle] = useState(isEdit ? state.chapter.title : '')
  const [contentJsonString, setContentJsonString] = useState(baseJsonString)
  const [plainText, setPlainText] = useState(basePlainText)
  const [chapterIndex, setChapterIndex] = useState(
    isEdit ? (state.chapter.chapterIndex ?? 1) : 1,
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

  // reset when switching between chapters/modes
  useEffect(() => {
    setTitle(isEdit ? state.chapter.title : '')
    setChapterIndex(isEdit ? (state.chapter.chapterIndex ?? 1) : 1)
    setContentJsonString(baseJsonString)
    setPlainText(basePlainText)
    setDirty(false)
    setSaveStatus('idle')
    setError('')
    setDraftExists(false)
  }, [baseJsonString, basePlainText, isEdit, state])

  // restore draft on enter
  useEffect(() => {
    if (!draftKey) return
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as Draft
      if (!parsed || typeof parsed !== 'object') return
      if (typeof parsed.updatedAt !== 'number') return

      if (isEdit) {
        const chapterUpdatedAt = Date.parse(state.chapter.updatedAt)
        if (!Number.isFinite(chapterUpdatedAt)) return
        if (parsed.updatedAt <= chapterUpdatedAt) return
      }

      if (typeof parsed.title === 'string') setTitle(parsed.title)
      if (typeof parsed.chapterIndex === 'number') setChapterIndex(parsed.chapterIndex)
      if (typeof parsed.content === 'string') setContentJsonString(parsed.content)
      setDraftExists(true)
      setDirty(true)
      setSaveStatus('unsaved')
    } catch {
      // ignore broken drafts
    }
  }, [draftKey, isEdit, state])

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
      try {
        const draft: Draft = {
          title,
          chapterIndex,
          content: contentJsonString,
          updatedAt: Date.now(),
        }
        localStorage.setItem(draftKey, JSON.stringify(draft))
        setDraftExists(true)
      } catch {
        // ignore quota errors
      }
    }, 500)

    return () => {
      if (draftWriteTimerRef.current) window.clearTimeout(draftWriteTimerRef.current)
    }
  }, [chapterIndex, contentJsonString, draftKey, title])

  // auto save (edit only)
  useEffect(() => {
    if (!isEdit) return
    if (!dirty) return

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
        await updateChapter(state.chapter.id, req)
        setDirty(false)
        setSaveStatus('saved')

        // keep draft synced (or can be cleared; we choose to keep it updated)
        if (draftKey) {
          const draft: Draft = {
            title: t,
            chapterIndex,
            content: contentJsonString,
            updatedAt: Date.now(),
          }
          localStorage.setItem(draftKey, JSON.stringify(draft))
          setDraftExists(true)
        }
      } catch {
        setSaveStatus('error')
      }
    }, 2500)

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current)
    }
  }, [chapterIndex, contentJsonString, dirty, draftKey, isEdit, plainText, state, title])

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
      await onSave(t, contentJsonString, chapterIndex)
      setDirty(false)
      setSaveStatus('saved')

      if (draftKey && !isEdit) {
        localStorage.removeItem(draftKey)
        setDraftExists(false)
      } else if (draftKey) {
        const draft: Draft = {
          title: t,
          chapterIndex,
          content: contentJsonString,
          updatedAt: Date.now(),
        }
        localStorage.setItem(draftKey, JSON.stringify(draft))
        setDraftExists(true)
      }
    } catch (e: any) {
      setError(e.message || '保存失败')
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <h2 className="text-sm font-semibold text-slate-700">
          {isEdit ? '编辑章节' : '新建章节'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
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

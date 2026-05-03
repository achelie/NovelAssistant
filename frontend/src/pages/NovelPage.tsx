import { useState } from 'react'
import { useNovel } from '../contexts/NovelContext'
import type { Novel } from '../types'

type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; novel: Novel }

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'ongoing', label: '连载中' },
  { value: 'completed', label: '已完结' },
] as const

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: '草稿', bg: 'bg-amber-100', text: 'text-amber-700' },
  ongoing: { label: '连载中', bg: 'bg-green-100', text: 'text-green-700' },
  completed: { label: '已完结', bg: 'bg-blue-100', text: 'text-blue-700' },
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function NovelPage() {
  const { novels, current, select, add, edit, remove, refresh } = useNovel()
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('draft')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function openCreate() {
    setTitle('')
    setDescription('')
    setStatus('draft')
    setError('')
    setModal({ mode: 'create' })
  }

  function openEdit(novel: Novel) {
    setTitle(novel.title)
    setDescription(novel.description ?? '')
    setStatus(novel.status)
    setError('')
    setModal({ mode: 'edit', novel })
  }

  function closeModal() {
    setModal({ mode: 'closed' })
    setError('')
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('小说标题不能为空')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (modal.mode === 'create') {
        await add({ title: title.trim(), description: description.trim() || undefined })
      } else if (modal.mode === 'edit') {
        await edit(modal.novel.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
        })
      }
      closeModal()
      await refresh()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? '操作失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await remove(id)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  const statusBadge = (s: string) => {
    const cfg = STATUS_CONFIG[s] ?? { label: s, bg: 'bg-gray-100', text: 'text-gray-600' }
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">小说管理</h1>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <PlusIcon />
            新建小说
          </button>
        </div>

        {/* Empty state */}
        {novels.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white py-24">
            <BookIcon className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">还没有小说，点击右上角创建你的第一本小说</p>
          </div>
        ) : (
          /* Novel grid */
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {novels.map((novel) => {
              const isActive = current?.id === novel.id
              return (
                <div
                  key={novel.id}
                  className={`group relative flex flex-col rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                    isActive
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-gray-200'
                  }`}
                >
                  {isActive && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      当前
                    </span>
                  )}

                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {novel.title}
                    </h3>
                    {statusBadge(novel.status)}
                  </div>

                  <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-500 line-clamp-2">
                    {novel.description || '暂无简介'}
                  </p>

                  <div className="mb-4 flex items-center gap-4 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <WordCountIcon />
                      {novel.wordCount.toLocaleString()} 字
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon />
                      {formatDate(novel.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                    {!isActive && (
                      <button
                        onClick={() => select(novel)}
                        className="rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100"
                      >
                        选为当前
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(novel)}
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-200"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`确定要删除「${novel.title}」吗？此操作不可恢复。`))
                          handleDelete(novel.id)
                      }}
                      disabled={deletingId === novel.id}
                      className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingId === novel.id ? '删除中…' : <TrashIcon />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal.mode !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              {modal.mode === 'create' ? '新建小说' : '编辑小说'}
            </h2>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <label className="mb-1 block text-sm font-medium text-gray-700">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入小说标题"
              className="mb-4 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <label className="mb-1 block text-sm font-medium text-gray-700">简介</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选：简要描述你的小说"
              className="mb-4 block w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {modal.mode === 'edit' && (
              <>
                <label className="mb-1 block text-sm font-medium text-gray-700">状态</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mb-4 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Inline SVG Icon Components ── */

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .7.797l-.5 6a.75.75 0 1 1-1.497-.126l.5-6a.75.75 0 0 1 .797-.67Zm3.638.797a.75.75 0 0 0-1.497-.126l-.5 6a.75.75 0 0 0 1.497.126l.5-6Z" clipRule="evenodd" />
    </svg>
  )
}

function WordCountIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
      <path fillRule="evenodd" d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4Zm1 2.5a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5Zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5Zm0 3a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5Z" clipRule="evenodd" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
      <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
    </svg>
  )
}

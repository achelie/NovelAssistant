import { useCallback, useEffect, useState } from 'react'
import { useNovel } from '../contexts/NovelContext'
import {
  listWorldSettingsByNovel,
  createWorldSetting,
  updateWorldSetting,
  deleteWorldSetting,
} from '../api/worldSetting'
import type { WorldSetting } from '../types'

const SETTING_TYPES = ['地理', '魔法', '科技', '历史'] as const

const TYPE_COLORS: Record<string, string> = {
  地理: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  魔法: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  科技: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  历史: 'bg-amber-50 text-amber-700 ring-amber-600/20',
}

interface ModalState {
  open: boolean
  editing: WorldSetting | null
}

export default function WorldSettingPage() {
  const { current } = useNovel()
  const [settings, setSettings] = useState<WorldSetting[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<ModalState>({ open: false, editing: null })
  const [saving, setSaving] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState<string>(SETTING_TYPES[0])
  const [formContent, setFormContent] = useState('')

  const fetchSettings = useCallback(async (novelId: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await listWorldSettingsByNovel(novelId)
      setSettings(res.data)
    } catch (e: any) {
      setError(e.message || '加载世界观设定失败')
      setSettings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (current) {
      fetchSettings(current.id)
    } else {
      setSettings([])
    }
  }, [current, fetchSettings])

  const openCreate = () => {
    setFormTitle('')
    setFormType(SETTING_TYPES[0])
    setFormContent('')
    setModal({ open: true, editing: null })
  }

  const openEdit = (ws: WorldSetting) => {
    setFormTitle(ws.title)
    setFormType(ws.type || SETTING_TYPES[0])
    setFormContent(ws.content ?? '')
    setModal({ open: true, editing: ws })
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
        await updateWorldSetting(modal.editing.id, {
          title: formTitle.trim(),
          type: formType,
          content: formContent.trim() || undefined,
        })
      } else {
        await createWorldSetting({
          novelId: current.id,
          title: formTitle.trim(),
          type: formType,
          content: formContent.trim() || undefined,
        })
      }
      closeModal()
      await fetchSettings(current.id)
    } catch (e: any) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条世界观设定吗？')) return
    setError('')
    try {
      await deleteWorldSetting(id)
      if (current) await fetchSettings(current.id)
    } catch (e: any) {
      setError(e.message || '删除失败')
    }
  }

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <GlobeIcon className="mx-auto h-12 w-12 text-slate-300" />
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
        <h1 className="text-xl font-bold text-slate-800">世界观设定 — {current.title}</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          新建设定
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : settings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <GlobeIcon className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">暂无世界观设定</p>
          <button
            onClick={openCreate}
            className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            创建第一条设定
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settings.map((ws) => (
            <div
              key={ws.id}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800 truncate flex-1">
                  {ws.title}
                </h3>
                <span
                  className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TYPE_COLORS[ws.type] || 'bg-slate-50 text-slate-600 ring-slate-500/20'}`}
                >
                  {ws.type}
                </span>
              </div>

              <p className="mt-2 flex-1 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                {ws.content || '暂无内容'}
              </p>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">{formatDate(ws.createdAt)}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(ws)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                    title="编辑"
                  >
                    <PenIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(ws.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    title="删除"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
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
              {modal.editing ? '编辑设定' : '新建设定'}
            </h2>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  标题 <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  placeholder="设定名称"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">类型</span>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                >
                  {SETTING_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">内容</span>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={6}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  placeholder="描述这条世界观设定的详细内容..."
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

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.732-3.558" />
    </svg>
  )
}

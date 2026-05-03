import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNovel } from '../contexts/NovelContext'
import { listCharacters } from '../api/character'
import {
  listPlotTimelinesByNovel,
  createPlotTimeline,
  updatePlotTimeline,
  deletePlotTimeline,
} from '../api/plotTimeline'
import type { Character, PlotTimeline, UpdatePlotTimelineRequest } from '../types'

interface ModalState {
  open: boolean
  editing: PlotTimeline | null
}

function parseStoredCharacterIds(raw: string | null | undefined): number[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

function formatRelatedCharacterLabels(
  csv: string | null,
  nameById: Map<number, string>,
): string {
  const ids = parseStoredCharacterIds(csv ?? '')
  if (ids.length === 0) return (csv ?? '').trim() || '—'
  return ids.map((id) => nameById.get(id) ?? `角色#${id}`).join('、')
}

export default function PlotTimelinePage() {
  const { current } = useNovel()
  const [items, setItems] = useState<PlotTimeline[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<ModalState>({ open: false, editing: null })
  const [saving, setSaving] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formEventTime, setFormEventTime] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<number[]>([])

  const characterNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const c of characters) {
      m.set(c.id, c.name)
    }
    return m
  }, [characters])

  const fetchList = useCallback(async (novelId: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await listPlotTimelinesByNovel(novelId)
      setItems(res.data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '加载剧情时间线失败'
      setError(msg)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCharacters = useCallback(async (novelId: number) => {
    try {
      const res = await listCharacters(1, 200)
      setCharacters(res.data.records.filter((c) => c.novelId === novelId))
    } catch {
      setCharacters([])
    }
  }, [])

  useEffect(() => {
    if (current) {
      fetchList(current.id)
      fetchCharacters(current.id)
    } else {
      setItems([])
      setCharacters([])
    }
  }, [current, fetchList, fetchCharacters])

  const toggleRelatedCharacter = (id: number) => {
    setSelectedCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].sort((a, b) => a - b),
    )
  }

  const clearRelatedCharacters = () => setSelectedCharacterIds([])

  const openCreate = () => {
    setFormTitle('')
    setFormEventTime('')
    setFormDescription('')
    setSelectedCharacterIds([])
    setModal({ open: true, editing: null })
  }

  const openEdit = (row: PlotTimeline) => {
    setFormTitle(row.title)
    setFormEventTime(row.eventTime ?? '')
    setFormDescription(row.description ?? '')
    setSelectedCharacterIds(parseStoredCharacterIds(row.relatedCharacters))
    setModal({ open: true, editing: row })
  }

  const closeModal = () => setModal({ open: false, editing: null })

  const handleSave = async () => {
    if (!formTitle.trim() || !current) return
    setSaving(true)
    setError('')
    const relatedCharacters =
      selectedCharacterIds.length > 0 ? selectedCharacterIds.join(',') : ''
    try {
      if (modal.editing) {
        const body: UpdatePlotTimelineRequest = {
          novelId: current.id,
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          eventTime: formEventTime.trim() || undefined,
          relatedCharacters,
        }
        await updatePlotTimeline(modal.editing.id, body)
      } else {
        await createPlotTimeline({
          novelId: current.id,
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          eventTime: formEventTime.trim() || undefined,
          relatedCharacters: relatedCharacters || undefined,
        })
      }
      closeModal()
      await fetchList(current.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该剧情节点吗？')) return
    setError('')
    try {
      await deletePlotTimeline(id)
      if (current) await fetchList(current.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <TimelineIcon className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">请先在左侧选择一本小说</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            &times;
          </button>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">剧情时间线 — {current.title}</h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4" />
          新建节点
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <TimelineIcon className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">暂无剧情节点</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            添加第一个节点
          </button>
        </div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute bottom-0 left-[11px] top-2 w-0.5 bg-indigo-100" aria-hidden />
          <ul className="space-y-6">
            {items.map((row) => (
              <li key={row.id} className="relative flex gap-4">
                <div className="absolute -left-6 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-indigo-200 bg-white ring-2 ring-white">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      {row.eventTime && (
                        <span className="mb-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {row.eventTime}
                        </span>
                      )}
                      <h2 className="text-base font-semibold text-slate-800">{row.title}</h2>
                      {row.description && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                          {row.description}
                        </p>
                      )}
                      {row.relatedCharacters && (
                        <p className="mt-2 text-xs text-slate-500">
                          相关角色：
                          {formatRelatedCharacterLabels(
                            row.relatedCharacters,
                            characterNameById,
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        title="编辑"
                      >
                        <PenIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        title="删除"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              {modal.editing ? '编辑剧情节点' : '新建剧情节点'}
            </h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  事件标题 <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="如：主角初入宗门"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">故事内时间</span>
                <input
                  type="text"
                  value={formEventTime}
                  onChange={(e) => setFormEventTime(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="如：大历三年春 / 第10章前后"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">事件描述</span>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={5}
                  className="block w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="情节要点、转折点等"
                />
              </label>
              <div className="block">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">相关角色（可选）</span>
                  {selectedCharacterIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearRelatedCharacters}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      清空已选
                    </button>
                  )}
                </div>
                {characters.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                    当前小说暂无角色，请先在「角色卡」中添加角色后再勾选。
                  </p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
                    {characters.map((ch) => {
                      const checked = selectedCharacterIds.includes(ch.id)
                      return (
                        <label
                          key={ch.id}
                          className={`flex cursor-pointer items-center rounded-md px-3 py-2 text-sm transition-colors ${
                            checked
                              ? 'border border-indigo-200 bg-indigo-50'
                              : 'border border-transparent bg-white hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRelatedCharacter(ch.id)}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 font-medium text-slate-800">{ch.name}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
                <p className="mt-1 text-xs text-slate-400">可多选。</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !formTitle.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving && (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {modal.editing ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  )
}

function TimelineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  )
}

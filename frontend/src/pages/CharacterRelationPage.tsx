import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNovel } from '../contexts/NovelContext'
import { listCharacters } from '../api/character'
import {
  listCharacterRelationsByNovel,
  createCharacterRelation,
  updateCharacterRelation,
  deleteCharacterRelation,
} from '../api/characterRelation'
import type { Character, CharacterRelation } from '../types'

interface ModalState {
  open: boolean
  editing: CharacterRelation | null
}

export default function CharacterRelationPage() {
  const { current } = useNovel()
  const [characters, setCharacters] = useState<Character[]>([])
  const [relations, setRelations] = useState<CharacterRelation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<ModalState>({ open: false, editing: null })
  const [saving, setSaving] = useState(false)

  const [formA, setFormA] = useState<number | ''>('')
  const [formB, setFormB] = useState<number | ''>('')
  const [formType, setFormType] = useState('')
  const [formDesc, setFormDesc] = useState('')

  const nameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const c of characters) {
      m.set(c.id, c.name)
    }
    return m
  }, [characters])

  const fetchAll = useCallback(async (novelId: number) => {
    setLoading(true)
    setError('')
    try {
      const [charRes, relRes] = await Promise.all([
        listCharacters(1, 200),
        listCharacterRelationsByNovel(novelId),
      ])
      setCharacters(charRes.data.records.filter((c) => c.novelId === novelId))
      setRelations(relRes.data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '加载人物关系失败'
      setError(msg)
      setCharacters([])
      setRelations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (current) {
      fetchAll(current.id)
    } else {
      setCharacters([])
      setRelations([])
    }
  }, [current, fetchAll])

  const openCreate = () => {
    setFormA('')
    setFormB('')
    setFormType('')
    setFormDesc('')
    setModal({ open: true, editing: null })
  }

  const openEdit = (rel: CharacterRelation) => {
    setFormA(rel.characterAId)
    setFormB(rel.characterBId)
    setFormType(rel.relationType)
    setFormDesc(rel.description ?? '')
    setModal({ open: true, editing: rel })
  }

  const closeModal = () => setModal({ open: false, editing: null })

  const handleSave = async () => {
    if (!current) return
    if (!formType.trim()) {
      setError('请填写关系类型')
      return
    }
    if (modal.editing) {
      setSaving(true)
      setError('')
      try {
        await updateCharacterRelation(modal.editing.id, {
          relationType: formType.trim(),
          description: formDesc.trim() || undefined,
        })
        closeModal()
        await fetchAll(current.id)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '保存失败')
      } finally {
        setSaving(false)
      }
      return
    }

    if (formA === '' || formB === '') {
      setError('请选择两个不同的角色')
      return
    }
    if (formA === formB) {
      setError('角色 A 与角色 B 不能相同')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createCharacterRelation({
        novelId: current.id,
        characterAId: formA,
        characterBId: formB,
        relationType: formType.trim(),
        description: formDesc.trim() || undefined,
      })
      closeModal()
      await fetchAll(current.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '创建失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条人物关系吗？')) return
    setError('')
    try {
      await deleteCharacterRelation(id)
      if (current) await fetchAll(current.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  const resolveName = (id: number) => nameById.get(id) ?? `ID ${id}`

  if (!current) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <LinkIcon className="mx-auto h-12 w-12 text-slate-300" />
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
        <h1 className="text-xl font-bold text-slate-800">人物关系 — {current.title}</h1>
        <button
          type="button"
          onClick={openCreate}
          disabled={characters.length < 2}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          新建关系
        </button>
      </div>

      {characters.length < 2 && (
        <p className="mb-4 text-sm text-amber-700">
          当前小说至少需要 2 个角色才能建立人物关系，请先到「角色卡」添加角色。
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : relations.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <LinkIcon className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">暂无人物关系</p>
          {characters.length >= 2 && (
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              添加第一条关系
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {relations.map((rel) => (
            <div
              key={rel.id}
              className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
            >
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-slate-800">{resolveName(rel.characterAId)}</span>
                <span className="mx-2 text-slate-300">—</span>
                <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                  {rel.relationType}
                </span>
                <span className="mx-2 text-slate-300">—</span>
                <span className="font-medium text-slate-800">{resolveName(rel.characterBId)}</span>
                {rel.description && (
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{rel.description}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => openEdit(rel)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                  title="编辑"
                >
                  <PenIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(rel.id)}
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

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              {modal.editing ? '编辑人物关系' : '新建人物关系'}
            </h2>

            {modal.editing ? (
              <div className="space-y-4">
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {resolveName(modal.editing.characterAId)}
                  <span className="mx-2 text-slate-400">与</span>
                  {resolveName(modal.editing.characterBId)}
                </p>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    关系类型 <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="如：师徒、敌对、挚友"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">关系描述</span>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={4}
                    className="block w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="补充说明，可选"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">角色 A</span>
                    <select
                      value={formA}
                      onChange={(e) => setFormA(e.target.value === '' ? '' : Number(e.target.value))}
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">请选择</option>
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">角色 B</span>
                    <select
                      value={formB}
                      onChange={(e) => setFormB(e.target.value === '' ? '' : Number(e.target.value))}
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">请选择</option>
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    关系类型 <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="如：师徒、敌对、挚友"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">关系描述</span>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={4}
                    className="block w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="可选"
                  />
                </label>
              </div>
            )}

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
                disabled={saving || !formType.trim()}
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

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 0 1 6.364 6.364l-3 3a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m4.243 4.242 4.243-4.243m-4.243 4.242L12 12m-4.243-4.243-1.757 1.757a4.5 4.5 0 0 0 6.364 6.364l3-3a4.5 4.5 0 0 0-6.364-6.364L7.757 7.757Z"
      />
    </svg>
  )
}

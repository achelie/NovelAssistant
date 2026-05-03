import { useCallback, useEffect, useState } from 'react'
import { useNovel } from '../contexts/NovelContext'
import {
  listCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from '../api/character'
import type {
  Character,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../types'

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; character: Character }

export default function CharacterPage() {
  const { current } = useNovel()
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })

  const fetchCharacters = useCallback(async (novelId: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await listCharacters(1, 200)
      setCharacters(res.data.records.filter((c) => c.novelId === novelId))
    } catch (e: any) {
      setError(e.message || '加载角色失败')
      setCharacters([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (current?.id) {
      fetchCharacters(current.id)
      setEditor({ mode: 'closed' })
    } else {
      setCharacters([])
    }
  }, [current?.id, fetchCharacters])

  const handleCreate = async (data: Omit<CreateCharacterRequest, 'novelId'>) => {
    if (!current) return
    try {
      await createCharacter({ ...data, novelId: current.id })
      setEditor({ mode: 'closed' })
      await fetchCharacters(current.id)
    } catch (e: any) {
      throw e
    }
  }

  const handleUpdate = async (id: number, data: UpdateCharacterRequest) => {
    if (!current) return
    try {
      await updateCharacter(id, data)
      setEditor({ mode: 'closed' })
      await fetchCharacters(current.id)
    } catch (e: any) {
      throw e
    }
  }

  const handleDelete = async (id: number) => {
    if (!current) return
    if (!confirm('确定要删除这个角色吗？')) return
    try {
      await deleteCharacter(id)
      if (editor.mode === 'edit' && editor.character.id === id) {
        setEditor({ mode: 'closed' })
      }
      await fetchCharacters(current.id)
    } catch (e: any) {
      setError(e.message || '删除失败')
    }
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

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-800">
            角色卡管理 — {current.title}
          </h1>
          <button
            onClick={() => setEditor({ mode: 'create' })}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            新建角色
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : characters.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
            <UserGroupIcon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-400">暂无角色，为你的小说创建第一个角色吧</p>
            <button
              onClick={() => setEditor({ mode: 'create' })}
              className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              创建角色
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((ch) => (
              <div
                key={ch.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <UserIcon className="h-4.5 w-4.5" />
                    </span>
                    <h3 className="text-base font-semibold text-slate-800">{ch.name}</h3>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditor({ mode: 'edit', character: ch })}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                      title="编辑"
                    >
                      <PenIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ch.id)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      title="删除"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {ch.description && (
                  <p className="mt-3 text-sm text-slate-500 line-clamp-2">{ch.description}</p>
                )}

                {ch.personality && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ch.personality.split(/[,，、;\s]+/).filter(Boolean).map((tag, i) => (
                      <span
                        key={i}
                        className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {ch.background && (
                  <p className="mt-3 text-xs text-slate-400 line-clamp-2">{ch.background}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Side panel editor */}
      {editor.mode !== 'closed' && (
        <CharacterEditor
          state={editor}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onClose={() => setEditor({ mode: 'closed' })}
        />
      )}
    </div>
  )
}

/* ── Character Editor Side Panel ── */

function CharacterEditor({
  state,
  onCreate,
  onUpdate,
  onClose,
}: {
  state: Exclude<EditorState, { mode: 'closed' }>
  onCreate: (data: Omit<CreateCharacterRequest, 'novelId'>) => Promise<void>
  onUpdate: (id: number, data: UpdateCharacterRequest) => Promise<void>
  onClose: () => void
}) {
  const isEdit = state.mode === 'edit'
  const [name, setName] = useState(isEdit ? state.character.name : '')
  const [description, setDescription] = useState(isEdit ? (state.character.description ?? '') : '')
  const [personality, setPersonality] = useState(isEdit ? (state.character.personality ?? '') : '')
  const [background, setBackground] = useState(isEdit ? (state.character.background ?? '') : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('角色名称不能为空')
      return
    }
    setError('')
    setSaving(true)
    try {
      if (isEdit) {
        await onUpdate(state.character.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          personality: personality.trim() || undefined,
          background: background.trim() || undefined,
        })
      } else {
        await onCreate({
          name: name.trim(),
          description: description.trim() || undefined,
          personality: personality.trim() || undefined,
          background: background.trim() || undefined,
        })
      }
    } catch (e: any) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-96 shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-700">
          {isEdit ? '编辑角色' : '新建角色'}
        </h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            名称 <span className="text-red-400">*</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            placeholder="角色名称"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">描述</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            placeholder="角色简要描述"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">性格特征</span>
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            rows={3}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            placeholder="如：勇敢、善良、倔强（用逗号分隔会显示为标签）"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">背景故事</span>
          <textarea
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            rows={4}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            placeholder="角色的背景故事..."
          />
        </label>
      </div>

      <div className="border-t border-slate-200 px-5 py-3 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {saving && (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isEdit ? '保存修改' : '创建角色'}
        </button>
      </div>
    </div>
  )
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

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

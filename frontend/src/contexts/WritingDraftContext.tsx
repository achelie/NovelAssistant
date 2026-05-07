import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { WritingPromptPreview } from '../types'
import { useAuth } from './AuthContext'

const WORD_OPTIONS = [2000, 3000, 4000] as const

export type WritingDraftPromptTab = 'full' | 'system' | 'user'

export interface WritingDraftState {
  summaryIds: number[]
  characterIds: number[]
  relationIds: number[]
  plotIds: number[]
  worldIds: number[]
  targetWords: (typeof WORD_OPTIONS)[number]
  outline: string
  writingStyle: string
  chapterTitle: string
  streamText: string
  preview: WritingPromptPreview | null
  promptTab: WritingDraftPromptTab
}

function emptyDraft(): WritingDraftState {
  return {
    summaryIds: [],
    characterIds: [],
    relationIds: [],
    plotIds: [],
    worldIds: [],
    targetWords: 3000,
    outline: '',
    writingStyle: '',
    chapterTitle: '',
    streamText: '',
    preview: null,
    promptTab: 'full',
  }
}

interface WritingDraftContextValue {
  getDraft: (novelId: number) => WritingDraftState
  updateDraft: (novelId: number, recipe: (d: WritingDraftState) => WritingDraftState) => void
}

const WritingDraftContext = createContext<WritingDraftContextValue | null>(null)

export function WritingDraftProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.userId
  const [map, setMap] = useState<Record<number, WritingDraftState>>({})

  useEffect(() => {
    setMap({})
  }, [userId])

  const getDraft = useCallback(
    (novelId: number) => map[novelId] ?? emptyDraft(),
    [map],
  )

  const updateDraft = useCallback(
    (novelId: number, recipe: (d: WritingDraftState) => WritingDraftState) => {
      setMap((prev) => {
        const cur = prev[novelId] ?? emptyDraft()
        return { ...prev, [novelId]: recipe(cur) }
      })
    },
    [],
  )

  const value = useMemo(
    () => ({ getDraft, updateDraft }),
    [getDraft, updateDraft],
  )

  return (
    <WritingDraftContext.Provider value={value}>{children}</WritingDraftContext.Provider>
  )
}

export function useWritingDraftContext() {
  const ctx = useContext(WritingDraftContext)
  if (!ctx) {
    throw new Error('useWritingDraftContext must be used within WritingDraftProvider')
  }
  return ctx
}

/** 按小说 ID 读写的续写草稿；切换路由不丢失，按 novelId 分本保存。 */
export function useWritingDraft(novelId: number | undefined) {
  const { getDraft, updateDraft } = useWritingDraftContext()
  const draft = novelId != null ? getDraft(novelId) : emptyDraft()

  const update = useCallback(
    (recipe: (d: WritingDraftState) => WritingDraftState) => {
      if (novelId != null) updateDraft(novelId, recipe)
    },
    [novelId, updateDraft],
  )

  const patch = useCallback(
    (partial: Partial<WritingDraftState>) => {
      if (novelId != null) {
        updateDraft(novelId, (d) => ({ ...d, ...partial }))
      }
    },
    [novelId, updateDraft],
  )

  const updateForNovel = useCallback(
    (id: number, recipe: (d: WritingDraftState) => WritingDraftState) => {
      updateDraft(id, recipe)
    },
    [updateDraft],
  )

  return { draft, update, patch, updateForNovel }
}

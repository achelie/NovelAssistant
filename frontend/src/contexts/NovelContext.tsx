import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { Novel } from '../types'
import { listNovels, createNovel, deleteNovel, updateNovel } from '../api/novel'
import type { CreateNovelRequest, UpdateNovelRequest } from '../types'
import { useAuth } from './AuthContext'

interface NovelContextValue {
  novels: Novel[]
  current: Novel | null
  loading: boolean
  select: (novel: Novel | null) => void
  refresh: () => Promise<void>
  add: (data: CreateNovelRequest) => Promise<Novel>
  edit: (id: number, data: UpdateNovelRequest) => Promise<void>
  remove: (id: number) => Promise<void>
}

const NovelContext = createContext<NovelContextValue | null>(null)

const STORAGE_KEY = 'novel_assistant_current_novel_id'

function keyForUser(userId: number | undefined | null) {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY
}

export function NovelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [novels, setNovels] = useState<Novel[]>([])
  const [current, setCurrent] = useState<Novel | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchNovels = useCallback(async () => {
    try {
      const res = await listNovels(1, 200)
      const list = res.data.records
      setNovels(list)
      return list
    } catch {
      return [] as Novel[]
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      // 换账号时立刻清空，避免继续用旧 novelId 发请求
      setCurrent(null)
      setLoading(true)

      if (!user) {
        setNovels([])
        setLoading(false)
        return
      }

      const list = await fetchNovels()
      const savedId = localStorage.getItem(keyForUser(user.userId))
      if (savedId) {
        const found = list.find((n) => n.id === Number(savedId))
        if (found) setCurrent(found)
      }
      setLoading(false)
    })()
  }, [fetchNovels, user?.userId])

  const select = useCallback((novel: Novel | null) => {
    setCurrent(novel)
    const storageKey = keyForUser(user?.userId)
    if (novel) {
      localStorage.setItem(storageKey, String(novel.id))
    } else {
      localStorage.removeItem(storageKey)
    }
  }, [user?.userId])

  const refresh = useCallback(async () => {
    const list = await fetchNovels()
    if (current) {
      const updated = list.find((n) => n.id === current.id)
      setCurrent(updated ?? null)
    }
  }, [fetchNovels, current])

  const add = useCallback(async (data: CreateNovelRequest) => {
    const res = await createNovel(data)
    const novel = res.data
    await fetchNovels()
    setCurrent(novel)
    localStorage.setItem(keyForUser(user?.userId), String(novel.id))
    return novel
  }, [fetchNovels, user?.userId])

  const edit = useCallback(async (id: number, data: UpdateNovelRequest) => {
    await updateNovel(id, data)
    const list = await fetchNovels()
    const updated = list.find((n) => n.id === id)
    if (current?.id === id && updated) setCurrent(updated)
  }, [fetchNovels, current])

  const remove = useCallback(async (id: number) => {
    await deleteNovel(id)
    if (current?.id === id) {
      setCurrent(null)
      localStorage.removeItem(keyForUser(user?.userId))
    }
    await fetchNovels()
  }, [fetchNovels, current, user?.userId])

  const value = useMemo(
    () => ({ novels, current, loading, select, refresh, add, edit, remove }),
    [novels, current, loading, select, refresh, add, edit, remove],
  )

  return <NovelContext.Provider value={value}>{children}</NovelContext.Provider>
}

export function useNovel() {
  const ctx = useContext(NovelContext)
  if (!ctx) throw new Error('useNovel must be used within NovelProvider')
  return ctx
}

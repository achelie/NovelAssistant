export interface ApiResult<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PageResult<T> {
  total: number
  page: number
  size: number
  records: T[]
}

// ── Auth ──

export interface UserInfo {
  userId: number
  username: string
  email: string
  avatarUrl: string | null
}

export interface LoginResponse extends UserInfo {
  token: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

// ── Novel ──

export interface Novel {
  id: number
  userId: number
  title: string
  description: string | null
  coverUrl: string | null
  status: string
  wordCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateNovelRequest {
  title: string
  description?: string
  coverUrl?: string
}

export interface UpdateNovelRequest {
  title?: string
  description?: string
  coverUrl?: string
  status?: string
}

// ── Chapter ──

export interface Chapter {
  id: number
  novelId: number
  title: string
  chapterIndex: number
  content: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateChapterRequest {
  novelId: number
  title: string
  content: string
  chapterIndex?: number
}

export interface UpdateChapterRequest {
  title?: string
  content?: string
  chapterIndex?: number
}

// ── Character ──

export interface Character {
  id: number
  novelId: number
  name: string
  description: string | null
  personality: string | null
  background: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCharacterRequest {
  novelId: number
  name: string
  description?: string
  personality?: string
  background?: string
}

export interface UpdateCharacterRequest {
  name?: string
  description?: string
  personality?: string
  background?: string
}

// ── WorldSetting ──

export interface WorldSetting {
  id: number
  novelId: number
  title: string
  content: string | null
  type: string
  createdAt: string
}

// ── Summary ──

export interface Summary {
  id: number
  novelId: number
  title: string
  chapterIndex: number
  content: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateSummaryRequest {
  novelId: number
  title: string
  chapterIndex: number
  content?: string
}

export interface UpdateSummaryRequest {
  title?: string
  chapterIndex?: number
  content?: string
}

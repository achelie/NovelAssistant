import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { LoginRequest, RegisterRequest, UserInfo } from '../types'
import { loginApi, registerApi } from '../api/auth'
import { getToken, removeToken, setToken } from '../api/request'

interface AuthContextValue {
  user: UserInfo | null
  loading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY = 'novel_assistant_user'

function loadUser(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveUser(user: UserInfo) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function clearUser() {
  localStorage.removeItem(USER_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    const saved = loadUser()
    if (token && saved) {
      setUser(saved)
    } else {
      removeToken()
      clearUser()
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (data: LoginRequest) => {
    const res = await loginApi(data)
    const { token, ...userInfo } = res.data
    setToken(token)
    saveUser(userInfo)
    setUser(userInfo)
  }, [])

  const register = useCallback(async (data: RegisterRequest) => {
    await registerApi(data)
  }, [])

  const logout = useCallback(() => {
    removeToken()
    clearUser()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

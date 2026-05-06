import axios from 'axios'
import type { ApiResult } from '../types'

const TOKEN_KEY = 'novel_assistant_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  ;(config as any).__tokenUsed = token
  return config
})

request.interceptors.response.use(
  (res) => {
    const result = res.data as ApiResult
    if (result.code !== 200) {
      return Promise.reject(new Error(result.message || '请求失败'))
    }
    return result as any
  },
  (err) => {
    if (err.response?.status === 401) {
      const tokenUsed: string | null | undefined = (err.config as any)?.__tokenUsed
      const current = getToken()
      // 避免“旧会话的 401”把新登录的 token 清掉
      if (!tokenUsed || tokenUsed === current) {
        removeToken()
        window.location.href = '/login'
      }
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }
    const msg = err.response?.data?.message || err.message || '网络请求失败'
    return Promise.reject(new Error(msg))
  },
)

export default request

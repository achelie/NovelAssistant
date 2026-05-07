import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthAlert, AuthTextField, PasswordField, PrimaryButton } from '../components/auth/AuthControls'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'

  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(form)
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="欢迎回来"
      subtitle="登录后继续你的写作进度与素材库。"
      footer={
        <p className="text-center">
          还没有账号？{' '}
          <Link to="/register" className="font-semibold text-indigo-200 hover:text-white">
            立即注册
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthAlert message={error} />

        <AuthTextField
          label="用户名"
          value={form.username}
          onChange={(v) => setForm((p) => ({ ...p, username: v }))}
          required
          autoComplete="username"
          placeholder="你的用户名"
          icon={<UserIcon className="h-4 w-4" />}
        />

        <PasswordField
          label="密码"
          value={form.password}
          onChange={(v) => setForm((p) => ({ ...p, password: v }))}
          required
          autoComplete="current-password"
          placeholder="输入密码"
        />

        <div className="flex items-center justify-between pt-1 text-xs">
          <span className="text-white/40">v0.1</span>
        </div>

        <PrimaryButton loading={submitting}>登 录</PrimaryButton>
      </form>
    </AuthShell>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.5 20a7.5 7.5 0 0 1 15 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

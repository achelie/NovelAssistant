import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AuthShell } from '../components/auth/AuthShell'
import { AuthAlert, AuthTextField, PasswordField, PrimaryButton } from '../components/auth/AuthControls'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('两次输入的密码不一致')
      return
    }
    if (form.password.length < 6) {
      setError('密码长度不能少于6位')
      return
    }

    setSubmitting(true)
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
      })
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <AuthShell
      title="创建账号"
      subtitle="用一个轻量账号，开启你的世界观与角色库。"
      footer={
        <p className="text-center">
          已有账号？{' '}
          <Link
            to="/login"
            className="font-semibold text-slate-600 underline decoration-slate-300/70 underline-offset-4 hover:text-[#6f542f] hover:decoration-[#6f542f]/40"
          >
            返回登录
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthAlert message={error} />

        <AuthTextField
          label="用户名"
          value={form.username}
          onChange={(v) => update('username', v)}
          required
          minLength={3}
          maxLength={20}
          autoComplete="username"
          placeholder="3-20 个字符"
          icon={<UserIcon className="h-4 w-4" />}
        />

        <AuthTextField
          label="邮箱"
          value={form.email}
          onChange={(v) => update('email', v)}
          required
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
          icon={<MailIcon className="h-4 w-4" />}
        />

        <PasswordField
          label="密码"
          value={form.password}
          onChange={(v) => update('password', v)}
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="至少 6 位"
        />

        <PasswordField
          label="确认密码"
          value={form.confirm}
          onChange={(v) => update('confirm', v)}
          required
          autoComplete="new-password"
          placeholder="再次输入密码"
        />
        <PrimaryButton loading={submitting}>注 册</PrimaryButton>
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

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 7.5h15v9h-15v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M5 8l7 6 7-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  )
}

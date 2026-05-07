import { useId, useState } from 'react'

export function AuthTextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  minLength,
  maxLength,
  autoComplete,
  icon,
  right,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  minLength?: number
  maxLength?: number
  autoComplete?: string
  icon?: React.ReactNode
  right?: React.ReactNode
}) {
  const id = useId()
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          type={type}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={[
            'block w-full rounded-xl border border-slate-900/10 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm',
            'focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/20',
            icon ? 'pl-10' : '',
            right ? 'pr-10' : '',
          ].join(' ')}
        />
        {right ? <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div> : null}
      </div>
    </label>
  )
}

export function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  minLength?: number
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <AuthTextField
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={show ? 'text' : 'password'}
      required={required}
      minLength={minLength}
      autoComplete={autoComplete}
      icon={<LockIcon className="h-4 w-4" />}
      right={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-900/5 hover:text-slate-700"
          aria-label={show ? '隐藏密码' : '显示密码'}
        >
          {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      }
    />
  )
}

export function AuthAlert({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="rounded-2xl border border-red-300/50 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-red-500/80">
          <AlertIcon className="h-4 w-4" />
        </span>
        <span className="leading-relaxed">{message}</span>
      </div>
    </div>
  )
}

export function PrimaryButton({
  children,
  loading,
  disabled,
}: {
  children: React.ReactNode
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={[
        'group relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold',
        'bg-gradient-to-b from-[#9a7848] to-[#6f542f] text-white shadow-[0_18px_60px_-28px_rgba(111,84,47,0.32)]',
        'hover:from-[#8b6b3f] hover:to-[#5f4727]',
        'disabled:cursor-not-allowed disabled:opacity-60',
      ].join(' ')}
    >
      <span className="absolute inset-0 rounded-xl ring-1 ring-[#6f542f]/18" />
      {loading ? <Spinner className="h-4 w-4" /> : null}
      <span className="relative">{children}</span>
    </button>
  )
}

function Spinner({ className }: { className?: string }) {
  return <span className={['inline-block animate-spin rounded-full border-2 border-white/70 border-t-transparent', className].join(' ')} />
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 10V8.4a4.5 4.5 0 0 1 9 0V10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6.7 10h10.6c.77 0 1.4.63 1.4 1.4v7.4c0 .77-.63 1.4-1.4 1.4H6.7c-.77 0-1.4-.63-1.4-1.4v-7.4c0-.77.63-1.4 1.4-1.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.7 12s3.6-6.8 9.3-6.8S21.3 12 21.3 12s-3.6 6.8-9.3 6.8S2.7 12 2.7 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4l16 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M3.3 12s1.9-3.7 5.4-5.7m3.1-1c.4-.06.8-.1 1.2-.1 5.7 0 9.3 6.8 9.3 6.8s-1.3 2.4-3.7 4.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.6 9.6a3.2 3.2 0 0 0 4.8 4.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8v5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 16.8h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M10.3 3.8h3.4L22 18.4a1.3 1.3 0 0 1-1.13 2H3.13A1.3 1.3 0 0 1 2 18.4L10.3 3.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  )
}


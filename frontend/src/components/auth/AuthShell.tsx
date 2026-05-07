import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -right-32 top-24 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.10] [background-image:radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.55)_1px,transparent_0)] [background-size:18px_18px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:py-14">
        <div className="w-full max-w-md">
          <div className="mx-auto w-full rounded-3xl border border-white/10 bg-white/[0.06] p-7 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.75)] ring-1 ring-white/10 sm:p-8">
            <div className="flex items-center justify-between">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10">
                  <LogoMark className="h-4 w-4 text-white/90" />
                </span>
                <span className="font-serif tracking-tight">云笔</span>
              </Link>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/60 ring-1 ring-white/10">
                Beta
              </span>
            </div>

            <div className="mt-6">
              <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
              <p className="mt-1 text-sm text-white/60">{subtitle}</p>
            </div>

            <div className="mt-6">{children}</div>

            <div className="mt-6 border-t border-white/10 pt-5 text-sm text-white/65">{footer}</div>
          </div>

          <p className="mx-auto mt-6 max-w-md text-center text-xs text-white/40">
            登录即表示你同意以合理方式使用模型输出
          </p>
        </div>
      </div>
    </div>
  )
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M8.2 12.6c-.3-.55-.45-1.15-.45-1.82 0-2.08 1.76-3.78 3.95-3.78.78 0 1.52.22 2.16.6.62-1.2 1.9-2 3.4-2 2.14 0 3.87 1.63 3.87 3.64 0 1.95-1.64 3.53-3.7 3.63H9.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.3 19.3 16.9 11.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M15.9 12.7l1.3 1.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M7.6 21.2l1.9-.55.55-1.9-2.45 2.45Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  )
}

// removed: left-side brand panel


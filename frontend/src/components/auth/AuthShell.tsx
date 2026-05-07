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
    <div className="relative min-h-screen overflow-hidden bg-[#fbf7ef] text-slate-900">
      {/* background */}
      <div className="pointer-events-none absolute inset-0">
        {/* paper wash */}
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(59,130,246,0.10),transparent_55%),radial-gradient(70%_55%_at_0%_30%,rgba(99,102,241,0.10),transparent_60%),radial-gradient(80%_60%_at_100%_70%,rgba(14,165,233,0.10),transparent_55%)]" />
        {/* subtle paper grain */}
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,rgba(2,6,23,0.55)_1px,transparent_0)] [background-size:22px_22px]" />
        {/* vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_10%,transparent_35%,rgba(2,6,23,0.06)_100%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:py-14">
        <div className="w-full max-w-md">
          <div className="mx-auto w-full rounded-3xl border border-slate-900/10 bg-white/70 p-7 shadow-[0_30px_120px_-60px_rgba(2,6,23,0.35)] ring-1 ring-white/60 backdrop-blur-md sm:p-8">
            <div className="flex items-center justify-between">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900/80 hover:text-slate-900">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white ring-1 ring-slate-900/10 shadow-sm">
                  <LogoMark className="h-4 w-4 text-slate-900/80" />
                </span>
                <span className="font-serif tracking-tight">云笔</span>
              </Link>
              <span className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] text-slate-700 ring-1 ring-slate-900/10">
                Beta
              </span>
            </div>

            <div className="mt-6">
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </div>

            <div className="mt-6">{children}</div>

            <div className="mt-6 border-t border-slate-900/10 pt-5 text-sm text-slate-600">{footer}</div>
          </div>

          <p className="mx-auto mt-6 max-w-md text-center text-xs text-slate-500">
            登录即表示你同意以合理方式使用模型输出。
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


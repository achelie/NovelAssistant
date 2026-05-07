import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CloudPenLogo } from '../brand/CloudPenLogo'

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
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(176,138,90,0.16),transparent_55%),radial-gradient(70%_55%_at_0%_30%,rgba(214,178,124,0.14),transparent_60%),radial-gradient(80%_60%_at_100%_70%,rgba(155,118,73,0.12),transparent_55%)]" />
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
                  <CloudPenLogo className="h-4 w-4 text-slate-900/80" />
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

// removed: left-side brand panel


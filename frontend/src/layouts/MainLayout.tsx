import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNovel } from '../contexts/NovelContext'
import { WritingDraftProvider } from '../contexts/WritingDraftContext'
import { CloudPenLogo } from '../components/brand/CloudPenLogo'

const statusLabels: Record<string, string> = {
  draft: '草稿',
  ongoing: '连载中',
  completed: '已完结',
}

interface NavItem {
  to: string
  end?: boolean
  label: string
  icon: React.FC<{ className?: string }>
  requiresNovel?: boolean
}

const navItems: NavItem[] = [
  { to: '/novels', label: '小说管理', icon: BookOpenIcon },
  { to: '/chapters', label: '章节管理', icon: DocumentIcon, requiresNovel: true },
  { to: '/summaries', label: '摘要管理', icon: ListIcon, requiresNovel: true },
  { to: '/', end: true, label: 'AI 续写', icon: PenIcon },
  { to: '/characters', label: '角色卡', icon: UserIcon, requiresNovel: true },
  { to: '/world-setting', label: '世界观设定', icon: GlobeIcon, requiresNovel: true },
  { to: '/character-relations', label: '人物关系', icon: LinkIcon, requiresNovel: true },
  { to: '/plot-timeline', label: '剧情时间线', icon: TimelineIcon, requiresNovel: true },
]

export default function MainLayout() {
  const { user, logout } = useAuth()
  const { novels, current, select, loading } = useNovel()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const initial = user?.username?.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-white border-r border-slate-200">
        {/* App title */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fbf7ef] ring-1 ring-slate-900/10 shadow-sm">
              <CloudPenLogo className="h-5 w-5 text-slate-900/80" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">云笔</h1>
              <p className="mt-0.5 text-xs text-slate-400">AI 写小说助手</p>
            </div>
          </div>
        </div>

        {/* Novel selector */}
        <div className="px-3 mb-3 relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100 transition-colors"
          >
            <span className={current ? 'text-slate-800 truncate' : 'text-slate-400'}>
              {loading ? '加载中…' : current?.title ?? '请选择小说'}
            </span>
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              {/* Overlay to close dropdown */}
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />

              <ul className="absolute left-3 right-3 top-full mt-1 z-20 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                {novels.length === 0 && (
                  <li className="px-3 py-4 text-center text-sm text-slate-400">暂无小说</li>
                )}
                {novels.map((novel) => (
                  <li key={novel.id}>
                    <button
                      type="button"
                      onClick={() => {
                        select(novel)
                        setDropdownOpen(false)
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-indigo-50 transition-colors ${
                        current?.id === novel.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate font-medium">{novel.title}</span>
                      <span className="ml-2 shrink-0 text-xs text-slate-400">
                        {statusLabels[novel.status] ?? novel.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <div>{item.label}</div>
                {item.requiresNovel && (
                  <div
                    className={`truncate text-xs mt-0.5 ${
                      current ? 'text-slate-400' : 'text-slate-400'
                    }`}
                  >
                    {current ? current.title : '(需选择小说)'}
                  </div>
                )}
              </div>
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{user?.username}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="退出登录"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <WritingDraftProvider>
          <Outlet />
        </WritingDraftProvider>
      </main>
    </div>
  )
}

/* ── Heroicons (outline, strokeWidth 1.5) ── */

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
  )
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.732-3.558" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  )
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 0 1 6.364 6.364l-3 3a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m4.243 4.242 4.243-4.243m-4.243 4.242L12 12m-4.243-4.243-1.757 1.757a4.5 4.5 0 0 0 6.364 6.364l3-3a4.5 4.5 0 0 0-6.364-6.364L7.757 7.757Z"
      />
    </svg>
  )
}

function TimelineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  )
}

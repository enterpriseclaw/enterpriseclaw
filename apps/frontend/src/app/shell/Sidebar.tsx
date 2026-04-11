import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, Trash2 } from 'lucide-react'
import { NAV_ITEMS } from './navConfig'
import { cn } from '@/lib/utils'
import { getChatService } from '@/domain/chat/chat.service'
import { config } from '@/lib/config'

function useSessionList() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => getChatService().listSessions(),
    staleTime: 30_000,
  })
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function Sidebar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: sessions = [] } = useSessionList()

  async function handleNewChat() {
    const session = await getChatService().createSession()
    queryClient.invalidateQueries({ queryKey: ['sessions'] })
    navigate(config.routes.chatSession(session.sessionId))
  }

  async function handleDeleteSession(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this session?')) return
    await getChatService().deleteSession(id)
    queryClient.invalidateQueries({ queryKey: ['sessions'] })
    navigate(config.routes.chat)
  }

  const recentSessions = sessions
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .slice(0, config.ui.sessionListLimit)

  return (
    <aside className="w-64 border-r bg-muted/40 flex flex-col h-full overflow-hidden">
      <div className="p-4 font-bold text-lg border-b flex items-center justify-between">
        <span>EnterpriseClaw</span>
        <button
          onClick={handleNewChat}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="New Chat"
        >
          <PlusCircle size={18} />
        </button>
      </div>

      {/* Session list */}
      {recentSessions.length > 0 && (
        <div className="border-b">
          <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Recent Chats
          </p>
          <div className="max-h-56 overflow-y-auto">
            {recentSessions.map(session => (
              <NavLink
                key={session.sessionId}
                to={config.routes.chatSession(session.sessionId)}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center justify-between px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )
                }
              >
                <span className="flex-1 truncate">
                  {session.title ?? 'New Chat'}
                </span>
                <span className="flex items-center gap-1 ml-1">
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(session.lastMessageAt)}
                  </span>
                  <button
                    onClick={e => handleDeleteSession(e, session.sessionId)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

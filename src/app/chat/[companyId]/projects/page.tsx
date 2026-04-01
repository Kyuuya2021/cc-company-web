import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: '進行中', color: 'bg-emerald-900 text-emerald-300' },
  completed: { label: '完了',   color: 'bg-zinc-800 text-zinc-400' },
  paused:    { label: '一時停止', color: 'bg-yellow-900 text-yellow-300' },
}

const TICKET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:        { label: '未着手',  color: 'bg-zinc-800 text-zinc-400' },
  in_progress: { label: '対応中',  color: 'bg-blue-900 text-blue-300' },
  done:        { label: '完了',    color: 'bg-emerald-900 text-emerald-300' },
}

export default async function ProjectsPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .eq('user_id', user.id)
    .single()
  if (!company) redirect('/chat')

  const [{ data: projects }, { data: tickets }] = await Promise.all([
    supabase.from('projects').select('*').eq('company_id', companyId).eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('tickets').select('*').eq('company_id', companyId).eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const ticketsByProject: Record<string, typeof tickets> = {}
  for (const ticket of tickets ?? []) {
    const pid = ticket.project_id ?? '__none__'
    if (!ticketsByProject[pid]) ticketsByProject[pid] = []
    ticketsByProject[pid]!.push(ticket)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-4 flex items-center gap-4">
        <Link
          href={`/chat/${companyId}`}
          className="text-zinc-400 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          ← チャットに戻る
        </Link>
        <div className="w-px h-4 bg-zinc-700" />
        <h1 className="font-bold text-base">📋 プロジェクト</h1>
        <span className="text-zinc-500 text-sm">{company.name}</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {!projects || projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-sm">まだプロジェクトがありません。</p>
            <p className="text-zinc-600 text-xs mt-2">チャットで「〇〇プロジェクトを作って」と話しかけてください。</p>
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map(project => {
              const status = STATUS_LABELS[project.status] ?? STATUS_LABELS.active
              const projectTickets = ticketsByProject[project.id] ?? []
              return (
                <div key={project.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                        <h3 className="font-semibold text-sm">{project.name}</h3>
                      </div>
                      {project.description && (
                        <p className="text-zinc-400 text-xs">{project.description}</p>
                      )}
                    </div>
                    <p className="text-zinc-600 text-xs flex-shrink-0">{project.created_at?.slice(0, 10)}</p>
                  </div>

                  {projectTickets.length > 0 && (
                    <div className="border-t border-zinc-800 divide-y divide-zinc-800">
                      {projectTickets.map(ticket => {
                        const ts = TICKET_STATUS_LABELS[ticket.status] ?? TICKET_STATUS_LABELS.open
                        return (
                          <div key={ticket.id} className="px-5 py-3 flex items-center gap-3">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${ts.color} flex-shrink-0`}>{ts.label}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-zinc-300 truncate">{ticket.title}</p>
                              {ticket.description && (
                                <p className="text-xs text-zinc-600 truncate">{ticket.description}</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {projectTickets.length === 0 && (
                    <div className="border-t border-zinc-800 px-5 py-3">
                      <p className="text-zinc-600 text-xs">チケットなし</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

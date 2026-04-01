import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:   { label: '取引中',   color: 'bg-emerald-900 text-emerald-300' },
  prospect: { label: '見込み',   color: 'bg-blue-900 text-blue-300' },
  inactive: { label: '非アクティブ', color: 'bg-zinc-800 text-zinc-400' },
}

export default async function ClientsPage({ params }: { params: Promise<{ companyId: string }> }) {
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

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

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
        <h1 className="font-bold text-base">👥 クライアント</h1>
        <span className="text-zinc-500 text-sm">{company.name}</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {!clients || clients.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-sm">まだクライアントがいません。</p>
            <p className="text-zinc-600 text-xs mt-2">チャットで「〇〇さんをクライアントに追加して」と話しかけてください。</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {clients.map(client => {
              const status = STATUS_LABELS[client.status] ?? STATUS_LABELS.active
              return (
                <li key={client.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                        <p className="font-semibold text-sm">{client.name}</p>
                      </div>
                      {client.contact && (
                        <p className="text-zinc-400 text-xs mb-1">📧 {client.contact}</p>
                      )}
                      {client.notes && (
                        <p className="text-zinc-500 text-xs">{client.notes}</p>
                      )}
                    </div>
                    <p className="text-zinc-600 text-xs flex-shrink-0">{client.created_at?.slice(0, 10)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

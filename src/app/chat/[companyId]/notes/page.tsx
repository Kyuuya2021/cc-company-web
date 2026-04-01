import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const NOTE_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  note:     { label: 'メモ',     icon: '📝' },
  decision: { label: '決定事項', icon: '✅' },
  idea:     { label: 'アイデア', icon: '💡' },
  inbox:    { label: '受信箱',   icon: '📥' },
}

export default async function NotesPage({ params }: { params: Promise<{ companyId: string }> }) {
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

  const { data: notes } = await supabase
    .from('notes')
    .select('id, title, content, note_type, department, date, created_at')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const grouped: Record<string, typeof notes> = { note: [], decision: [], idea: [], inbox: [] }
  for (const note of notes ?? []) {
    const t = note.note_type ?? 'note'
    if (!grouped[t]) grouped[t] = []
    grouped[t]!.push(note)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ヘッダー */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-4 flex items-center gap-4">
        <Link
          href={`/chat/${companyId}`}
          className="text-zinc-400 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          ← チャットに戻る
        </Link>
        <div className="w-px h-4 bg-zinc-700" />
        <h1 className="font-bold text-base">📝 ノート・メモ</h1>
        <span className="text-zinc-500 text-sm">{company.name}</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {Object.entries(NOTE_TYPE_LABELS).map(([type, { label, icon }]) => {
          const items = grouped[type] ?? []
          return (
            <section key={type}>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>{icon}</span> {label}
                <span className="text-zinc-600 font-normal normal-case tracking-normal">({items.length}件)</span>
              </h2>
              {items.length === 0 ? (
                <p className="text-zinc-600 text-sm">まだ{label}はありません。チャットで秘書に話しかけると自動で記録されます。</p>
              ) : (
                <ul className="space-y-3">
                  {items.map(note => (
                    <li key={note.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {note.title && (
                            <p className="font-medium text-sm mb-1 truncate">{note.title}</p>
                          )}
                          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
                        </div>
                        <div className="text-right flex-shrink-0 text-xs text-zinc-600 space-y-1">
                          <p>{note.date}</p>
                          {note.department && note.department !== 'secretary' && (
                            <p className="text-zinc-500">{note.department}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

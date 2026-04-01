import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ExpensesPage({ params }: { params: Promise<{ companyId: string }> }) {
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

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  const total = (expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0)

  // 月別に集計
  const byMonth: Record<string, { items: typeof expenses; total: number }> = {}
  for (const expense of expenses ?? []) {
    const month = (expense.date ?? '').slice(0, 7)
    if (!byMonth[month]) byMonth[month] = { items: [], total: 0 }
    byMonth[month].items!.push(expense)
    byMonth[month].total += expense.amount ?? 0
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
        <h1 className="font-bold text-base">💰 経費</h1>
        <span className="text-zinc-500 text-sm">{company.name}</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {!expenses || expenses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-sm">まだ経費が記録されていません。</p>
            <p className="text-zinc-600 text-xs mt-2">チャットで「〇〇円の交通費を記録して」と話しかけてください。</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 合計サマリー */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex items-center justify-between">
              <p className="text-zinc-400 text-sm">総経費合計</p>
              <p className="text-xl font-bold">¥{total.toLocaleString()}</p>
            </div>

            {/* 月別一覧 */}
            {Object.entries(byMonth).map(([month, { items, total: monthTotal }]) => (
              <section key={month}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-zinc-400">{month}</h2>
                  <p className="text-sm text-zinc-400">¥{monthTotal.toLocaleString()}</p>
                </div>
                <ul className="space-y-2">
                  {(items ?? []).map(expense => (
                    <li key={expense.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200">{expense.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-zinc-600">{expense.date}</p>
                          {expense.category && (
                            <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{expense.category}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-medium flex-shrink-0">¥{(expense.amount ?? 0).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

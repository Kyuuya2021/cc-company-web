import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DisconnectButton from './DisconnectButton'

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { companyId } = await params
  const { connected, error } = await searchParams

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

  const { data: integrations } = await supabase
    .from('integrations')
    .select('provider, email')
    .eq('user_id', user.id)

  const byProvider: Record<string, { email: string }> = {}
  for (const row of integrations ?? []) {
    byProvider[row.provider] = { email: row.email }
  }

  const connectedMessages: Record<string, string> = {
    google: 'Google (Calendar, Gmail, Drive) の連携が完了しました！',
    notion: 'Notion の連携が完了しました！',
    github: 'GitHub の連携が完了しました！',
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
        <h1 className="font-bold text-base">⚙️ 設定・連携</h1>
        <span className="text-zinc-500 text-sm">{company.name}</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* 成功・エラーメッセージ */}
        {connected && connectedMessages[connected] && (
          <div className="bg-emerald-900/40 border border-emerald-700 rounded-xl px-4 py-3 text-emerald-300 text-sm">
            {connectedMessages[connected]}
          </div>
        )}
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
            連携中にエラーが発生しました: {error}
          </div>
        )}

        {/* 外部サービス連携セクション */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">外部サービス連携</h2>
          <div className="space-y-3">

            {/* Google (Calendar + Gmail + Drive) */}
            <IntegrationCard
              icon="🔵"
              name="Google (Calendar · Gmail · Drive)"
              description={byProvider['google']
                ? `${byProvider['google'].email} で連携中`
                : 'カレンダー・メール・ドライブを一括で連携'}
              connected={!!byProvider['google']}
              provider="google"
              connectHref={`/api/auth/google?companyId=${companyId}`}
              connectLabel="Googleで連携する"
              hints={[
                '「今週の予定は？」「明日14時にMTGを追加して」',
                '「〇〇さんからのメールを探して」「〇〇の件で下書きを作って」',
                '「ドライブの企画書を見せて」',
              ]}
            />

            {/* Notion */}
            <IntegrationCard
              icon="N"
              name="Notion"
              description={byProvider['notion']
                ? `${byProvider['notion'].email} で連携中`
                : 'ドキュメント・ナレッジの検索・作成'}
              connected={!!byProvider['notion']}
              provider="notion"
              connectHref={`/api/auth/notion?companyId=${companyId}`}
              connectLabel="Notionで連携する"
              hints={[
                '「〇〇についてのNotionページを探して」',
                '「今日の議事録をNotionに追加して」',
              ]}
            />

            {/* GitHub */}
            <IntegrationCard
              icon="🐙"
              name="GitHub"
              description={byProvider['github']
                ? `${byProvider['github'].email} で連携中`
                : 'Issue・PRの確認・作成'}
              connected={!!byProvider['github']}
              provider="github"
              connectHref={`/api/auth/github?companyId=${companyId}`}
              connectLabel="GitHubで連携する"
              hints={[
                '「owner/repoのオープンIssueを見せて」',
                '「〇〇リポジトリにバグ報告のIssueを作って」',
              ]}
            />

          </div>
        </section>
      </div>
    </div>
  )
}

function IntegrationCard({
  icon, name, description, connected, provider, connectHref, connectLabel, hints,
}: {
  icon: string
  name: string
  description: string
  connected: boolean
  provider: string
  connectHref: string
  connectLabel: string
  hints?: string[]
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-xl flex-shrink-0 font-bold">
            {icon}
          </div>
          <div>
            <p className="font-medium text-sm">{name}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{description}</p>
          </div>
        </div>

        {connected ? (
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              連携済み
            </span>
            <DisconnectButton provider={provider} />
          </div>
        ) : (
          <Link
            href={connectHref}
            className="flex-shrink-0 px-4 py-2 bg-white text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-100 transition-colors"
          >
            {connectLabel}
          </Link>
        )}
      </div>

      {connected && hints && hints.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800 space-y-0.5">
          {hints.map((h, i) => (
            <p key={i} className="text-zinc-500 text-xs">試す：{h}</p>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const features = [
  {
    icon: '🤵',
    title: 'チャットで話しかけるだけ',
    desc: '「提案書を作る」と送るだけでTODOが追加される。入力フォームは不要。',
  },
  {
    icon: '🏢',
    title: '部署が自動で生まれる',
    desc: '最初は秘書室だけ。作業が増えると「PM部署を作りましょうか？」と提案される。',
  },
  {
    icon: '📝',
    title: 'ノート・TODO・経費を自動記録',
    desc: '会話の中から決定事項・アイデア・経費を自動で分類して保存。',
  },
  {
    icon: '🏗️',
    title: '複数の会社・事業を管理',
    desc: '会社ごとにデータが独立。副業・複数プロジェクトもまとめて管理できる。',
  },
]

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleGoogleLogin() {
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        router.push('/onboarding')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
      }
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950">
      {/* Left: product description */}
      <div className="flex-1 flex flex-col justify-center px-10 py-14 md:px-16 md:py-0 border-b border-zinc-800 md:border-b-0 md:border-r md:border-zinc-800">
        <div className="max-w-lg">
          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-4">CC Company</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-snug mb-4">
            AIが秘書として<br />仕事を管理してくれる
          </h1>
          <p className="text-zinc-400 text-base mb-10">
            チャットで話しかけるだけ。TODO・メモ・プロジェクト・経費をAIが自動で整理します。
          </p>

          <div className="space-y-6">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 items-start">
                <span className="text-2xl mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-white font-medium text-sm mb-0.5">{f.title}</p>
                  <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <p className="text-zinc-500 text-xs mb-2">使用例</p>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-zinc-600 shrink-0">あなた</span>
                <span className="text-zinc-300">「田中さんとの打ち合わせで月額5万円で合意した」</span>
              </div>
              <div className="flex gap-2">
                <span className="text-zinc-600 shrink-0">秘書</span>
                <span className="text-zinc-400">決定事項としてノートに保存しました。クライアントに田中さんを追加しますか？</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: auth form */}
      <div className="w-full md:w-[440px] flex items-center justify-center px-8 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-1">
              {mode === 'login' ? 'ログイン' : 'アカウントを作成'}
            </h2>
            <p className="text-zinc-500 text-sm">
              {mode === 'login' ? 'はじめての方は' : 'すでにアカウントをお持ちの方は'}
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-zinc-300 underline underline-offset-2 ml-1 hover:text-white transition-colors"
              >
                {mode === 'login' ? '新規登録' : 'ログイン'}
              </button>
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 flex items-center justify-center gap-3 bg-zinc-800 border border-zinc-700 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Googleでログイン
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-600 text-xs">または</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                placeholder="6文字以上"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-white text-zinc-900 font-medium rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-50"
            >
              {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウント作成'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

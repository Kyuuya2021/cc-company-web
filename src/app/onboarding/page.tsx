'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [goals, setGoals] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleComplete() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 最初の会社を作成
    const { data: company } = await supabase.from('companies').insert({
      user_id: user.id,
      name: name.trim() || businessType,
      business_type: businessType,
      goals_challenges: goals,
    }).select('id').single()

    // オンボーディング完了フラグ
    await supabase.from('profiles').upsert({
      id: user.id,
      business_type: businessType,
      goals_challenges: goals,
      onboarding_completed: true,
    })

    if (company) {
      router.push(`/chat/${company.id}`)
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-lg px-8 py-10 bg-zinc-900 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s <= step ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-500'
              }`}>{s}</div>
              {s < 3 && <div className={`h-0.5 w-16 transition-colors ${step > s ? 'bg-white' : 'bg-zinc-700'}`} />}
            </div>
          ))}
          <span className="ml-2 text-zinc-500 text-sm">{step} / 3</span>
        </div>

        <div className="flex items-start gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-lg flex-shrink-0">🤵</div>
          <div className="bg-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-zinc-200 leading-relaxed">
            {step === 1 && (
              <>はじめまして！あなたの秘書になります。<br />まず、最初の会社・プロジェクトの名前を教えてください。<br /><span className="text-zinc-500 text-xs mt-1 block">例: フリーランス、副業SaaS、YouTube運用など</span></>
            )}
            {step === 2 && (
              <>ありがとうございます！<br />どんな事業・活動ですか？<br /><span className="text-zinc-500 text-xs mt-1 block">例: 個人開発、フリーランス、副業、スタートアップ、学業など</span></>
            )}
            {step === 3 && (
              <>もう少しで完成です！<br />今の目標や、日々困っていることがあれば教えてください。<br /><span className="text-zinc-500 text-xs mt-1 block">例: 「SaaSで月10万目指してる」「タスクが散らかる」「アイデアを忘れる」</span></>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {step === 1 && (
            <>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                placeholder="会社・プロジェクト名..."
              />
              <button onClick={() => setStep(2)} disabled={!name.trim()} className="w-full py-2.5 bg-white text-zinc-900 font-medium rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-40">次へ</button>
            </>
          )}
          {step === 2 && (
            <>
              <textarea value={businessType} onChange={e => setBusinessType(e.target.value)} rows={3} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none" placeholder="あなたの事業・活動を入力してください..." />
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-5 py-2.5 text-zinc-400 border border-zinc-700 font-medium rounded-xl hover:bg-zinc-800 transition-colors">戻る</button>
                <button onClick={() => setStep(3)} disabled={!businessType.trim()} className="flex-1 py-2.5 bg-white text-zinc-900 font-medium rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-40">次へ</button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <textarea value={goals} onChange={e => setGoals(e.target.value)} rows={3} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none" placeholder="目標や困っていることを入力してください..." />
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-5 py-2.5 text-zinc-400 border border-zinc-700 font-medium rounded-xl hover:bg-zinc-800 transition-colors">戻る</button>
                <button onClick={handleComplete} disabled={!goals.trim() || loading} className="flex-1 py-2.5 bg-white text-zinc-900 font-medium rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-40">
                  {loading ? 'セットアップ中...' : '秘書室を作成する'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DEPARTMENT_CONFIG, DepartmentSlug } from '@/lib/agents/departments'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  department?: string
  created_at: string
}

interface Todo {
  id: string
  content: string
  done: boolean
  date: string
}

interface Company {
  id: string
  name: string
  business_type: string
  goals_challenges: string
}

interface Department {
  id: string
  name: string
  description: string
  slug: string
  icon: string
  color: string
}

interface ChatClientProps {
  company: Company
  allCompanies: { id: string; name: string; business_type: string }[]
  initialTodos: Todo[]
  initialMessages: Message[]
  initialDepartments: Department[]
}

function DepartmentBadge({ slug }: { slug: string }) {
  const config = DEPARTMENT_CONFIG[slug as DepartmentSlug] ?? DEPARTMENT_CONFIG.secretary
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.color} ${config.textColor} mb-1`}>
      {config.icon} {config.label}
    </span>
  )
}

export default function ChatClient({ company, allCompanies, initialTodos, initialMessages, initialDepartments }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const displayMessages = messages.length === 0
    ? [{
        id: 'welcome',
        role: 'assistant' as const,
        content: `おはようございます！秘書です。\n「${company.business_type}」のお手伝いをします。\n\nTODOの追加、メモ、プロジェクト管理、何でも気軽に話しかけてください！`,
        department: 'secretary',
        created_at: new Date().toISOString(),
      }]
    : messages

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const historyForAPI = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: historyForAPI, companyId: company.id }),
      })

      const { reply, department } = await res.json()

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        department: department || 'secretary',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])

      const today = new Date().toISOString().split('T')[0]
      const [{ data: updatedTodos }, { data: updatedDepts }] = await Promise.all([
        supabase.from('todos').select('*').eq('company_id', company.id).eq('date', today).order('created_at', { ascending: true }),
        supabase.from('departments').select('*').eq('company_id', company.id).order('created_at', { ascending: true }),
      ])
      if (updatedTodos) setTodos(updatedTodos)
      if (updatedDepts) setDepartments(updatedDepts)

    } catch {
      setMessages(prev => [...prev, {
        id: 'error',
        role: 'assistant',
        content: 'すみません、エラーが発生しました。もう一度お試しください。',
        department: 'secretary',
        created_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  async function toggleTodo(todo: Todo) {
    await supabase.from('todos').update({ done: !todo.done }).eq('id', todo.id)
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  function cleanContent(content: string) {
    return content.replace(/```action[\s\S]*?```/g, '').trim()
  }

  const today = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
  const doneTodos = todos.filter(t => t.done).length

  const sidebarDepts = [
    { slug: 'secretary', name: '秘書室', icon: '🤵' },
    ...departments.map(d => ({
      slug: d.slug || 'secretary',
      name: d.name,
      icon: d.icon || (DEPARTMENT_CONFIG[(d.slug as DepartmentSlug) ?? 'secretary']?.icon ?? '🏢'),
    })),
  ]

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* サイドバー */}
      {sidebarOpen && (
        <div className="w-72 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          {/* 会社セレクター */}
          <div className="p-4 border-b border-zinc-800 relative">
            <button
              onClick={() => setCompanyMenuOpen(v => !v)}
              className="w-full flex items-center justify-between group"
            >
              <div className="text-left">
                <h1 className="font-bold text-base truncate">{company.name || 'CC Company'}</h1>
                <p className="text-zinc-500 text-xs mt-0.5 truncate">{company.business_type}</p>
              </div>
              <svg className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform ${companyMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 会社ドロップダウン */}
            {companyMenuOpen && (
              <div className="absolute top-full left-0 right-0 z-50 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl m-2 overflow-hidden">
                {allCompanies.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setCompanyMenuOpen(false); router.push(`/chat/${c.id}`) }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-zinc-700 transition-colors flex items-center gap-2 ${c.id === company.id ? 'text-white' : 'text-zinc-400'}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" style={{ opacity: c.id === company.id ? 1 : 0 }} />
                    <div>
                      <p className="font-medium">{c.name || c.business_type}</p>
                      <p className="text-zinc-500 text-xs">{c.business_type}</p>
                    </div>
                  </button>
                ))}
                <div className="border-t border-zinc-700">
                  <button
                    onClick={() => { setCompanyMenuOpen(false); router.push('/companies/new') }}
                    className="w-full text-left px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors flex items-center gap-2"
                  >
                    <span className="text-lg">＋</span>
                    <span>新しい会社を追加</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-5">
            {/* ダッシュボード */}
            <div className="bg-zinc-800 rounded-xl p-3">
              <p className="text-xs text-zinc-400 mb-1">{today}</p>
              <p className="text-sm font-medium">TODO: <span className="text-white">{doneTodos}/{todos.length}</span> 完了</p>
            </div>

            {/* 部署一覧 */}
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">部署</h2>
              <ul className="space-y-1">
                {sidebarDepts.map(dept => {
                  const config = DEPARTMENT_CONFIG[dept.slug as DepartmentSlug] ?? DEPARTMENT_CONFIG.secretary
                  return (
                    <li key={dept.slug} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                      <span>{dept.icon}</span>
                      <span>{dept.name}</span>
                      <span className={`ml-auto w-2 h-2 rounded-full ${config.color}`} />
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* データページナビゲーション */}
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">データ</h2>
              <ul className="space-y-1">
                {[
                  { href: `/chat/${company.id}/notes`, icon: '📝', label: 'ノート・メモ' },
                  { href: `/chat/${company.id}/projects`, icon: '📋', label: 'プロジェクト' },
                  { href: `/chat/${company.id}/clients`, icon: '👥', label: 'クライアント' },
                  { href: `/chat/${company.id}/expenses`, icon: '💰', label: '経費' },
                  { href: `/chat/${company.id}/settings`, icon: '⚙️', label: '設定・連携' },
                ].map(item => (
                  <li key={item.href}>
                    <button
                      onClick={() => router.push(item.href)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* TODOリスト */}
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">今日のTODO</h2>
              {todos.length === 0 ? (
                <p className="text-zinc-600 text-sm">TODOなし</p>
              ) : (
                <ul className="space-y-1.5">
                  {todos.map(todo => (
                    <li
                      key={todo.id}
                      className="flex items-start gap-2 group cursor-pointer"
                      onClick={() => toggleTodo(todo)}
                    >
                      <div className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border transition-colors ${
                        todo.done ? 'bg-white border-white' : 'border-zinc-600 group-hover:border-zinc-400'
                      }`}>
                        {todo.done && (
                          <svg className="w-4 h-4 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm leading-snug ${todo.done ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                        {todo.content}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800">
            <button onClick={handleSignOut} className="w-full text-left text-sm text-zinc-500 hover:text-white transition-colors">
              ログアウト
            </button>
          </div>
        </div>
      )}

      {/* チャットエリア */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
          <button onClick={() => setSidebarOpen(v => !v)} className="text-zinc-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-base">🏢</div>
          <div>
            <p className="text-sm font-medium">{company.name || 'CC Company'}</p>
            <p className="text-xs text-zinc-500">{sidebarDepts.length}部署が稼働中</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {displayMessages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-base">
                    {DEPARTMENT_CONFIG[(msg.department as DepartmentSlug) ?? 'secretary']?.icon ?? '🤵'}
                  </div>
                </div>
              )}
              <div className="flex flex-col max-w-[75%]">
                {msg.role === 'assistant' && msg.department && msg.department !== 'secretary' && (
                  <DepartmentBadge slug={msg.department} />
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-white text-zinc-900 rounded-tr-sm'
                    : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
                }`}>
                  {cleanContent(msg.content)}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-base flex-shrink-0">🏢</div>
              <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
                  <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
                  <div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-zinc-800 bg-zinc-950">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="秘書に話しかける... (TODO・プロジェクト・メモ・相談など)"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 bg-white text-zinc-900 font-medium rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-40"
            >
              送信
            </button>
          </form>
          <p className="text-center text-zinc-600 text-xs mt-2">秘書が最適な部署に振り分けます</p>
        </div>
      </div>
    </div>
  )
}

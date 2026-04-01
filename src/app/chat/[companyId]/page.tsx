import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatClient from './ChatClient'

export default async function ChatPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  // 会社の存在確認（自分のものか）
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .eq('user_id', user.id)
    .single()

  if (!company) redirect('/chat')

  // 全ユーザーの会社一覧
  const { data: allCompanies } = await supabase
    .from('companies')
    .select('id, name, business_type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: todos },
    { data: messages },
    { data: departments },
  ] = await Promise.all([
    supabase.from('todos').select('*').eq('company_id', companyId).eq('user_id', user.id).eq('date', today).order('created_at', { ascending: true }),
    supabase.from('messages').select('*').eq('company_id', companyId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('departments').select('*').eq('company_id', companyId).eq('user_id', user.id).order('created_at', { ascending: true }),
  ])

  return (
    <ChatClient
      company={company}
      allCompanies={allCompanies || []}
      initialTodos={todos || []}
      initialMessages={(messages || []).reverse()}
      initialDepartments={departments || []}
    />
  )
}

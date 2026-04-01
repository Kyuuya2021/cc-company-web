import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ChatIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  // 最初の会社にリダイレクト
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!companies || companies.length === 0) {
    // 会社がない場合はオンボーディングへ
    redirect('/onboarding')
  }

  redirect(`/chat/${companies[0].id}`)
}

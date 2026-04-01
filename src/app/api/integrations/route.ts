import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider } = await request.json()
  if (!provider) return Response.json({ error: 'provider required' }, { status: 400 })

  await supabase
    .from('integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider)

  return Response.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) return Response.json({ debug: 'no code', error, code })

  const savedState = request.cookies.get('notion_oauth_state')?.value
  const companyId = request.cookies.get('notion_oauth_company')?.value ?? ''
  if (!savedState || savedState !== state) return Response.json({ debug: 'state mismatch', savedState, state })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ debug: 'no user' })

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/notion/callback`
    const credentials = btoa(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`)

    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    })
    const tokenBody = await tokenRes.json()
    if (!tokenRes.ok) return Response.json({ debug: 'token exchange failed', status: tokenRes.status, body: tokenBody })

    const farFuture = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString()

    const { error: upsertError } = await supabase.from('integrations').upsert({
      user_id: user.id,
      provider: 'notion',
      access_token: tokenBody.access_token,
      refresh_token: null,
      expires_at: farFuture,
      scope: 'read,write',
      email: tokenBody.workspace_name ?? tokenBody.owner?.user?.name ?? 'Notionワークスペース',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' })

    if (upsertError) return Response.json({ debug: 'upsert error', upsertError })

    const response = NextResponse.redirect(new URL(`/chat/${companyId}/settings?connected=notion`, request.url))
    response.cookies.delete('notion_oauth_state')
    response.cookies.delete('notion_oauth_company')
    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ debug: 'exception', msg })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) return NextResponse.redirect(new URL('/chat', request.url))

  const savedState = request.cookies.get('github_oauth_state')?.value
  const companyId = request.cookies.get('github_oauth_company')?.value ?? ''
  if (!savedState || savedState !== state) return NextResponse.redirect(new URL('/auth', request.url))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth', request.url))

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })
    if (!tokenRes.ok) throw new Error('GitHub token exchange failed')
    const tokens = await tokenRes.json()
    if (tokens.error) throw new Error(tokens.error_description ?? tokens.error)

    // GitHubのアクセストークンは有効期限なし（farFutureで保存）
    const farFuture = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString()

    // GitHubユーザー情報取得
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    })
    const githubUser = userRes.ok ? await userRes.json() : {}

    await supabase.from('integrations').upsert({
      user_id: user.id,
      provider: 'github',
      access_token: tokens.access_token,
      refresh_token: null,
      expires_at: farFuture,
      scope: tokens.scope ?? 'repo',
      email: githubUser.login ?? githubUser.name ?? 'GitHubアカウント',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' })

    const response = NextResponse.redirect(new URL(`/chat/${companyId}/settings?connected=github`, request.url))
    response.cookies.delete('github_oauth_state')
    response.cookies.delete('github_oauth_company')
    return response
  } catch {
    return NextResponse.redirect(new URL(`/chat/${companyId}/settings?error=true`, request.url))
  }
}

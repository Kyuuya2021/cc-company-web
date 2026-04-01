import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getGoogleEmail } from '@/lib/google/oauth'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // ユーザーがキャンセルした場合
  if (error || !code) {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  // CSRF検証
  const savedState = request.cookies.get('google_oauth_state')?.value
  const companyId = request.cookies.get('google_oauth_company')?.value ?? ''

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // 認証ユーザー確認
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth', request.url))

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    const tokens = await exchangeCodeForTokens(code, redirectUri)
    const email = await getGoogleEmail(tokens.access_token)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // トークンをSupabaseに保存（upsert）
    await supabase.from('integrations').upsert({
      user_id: user.id,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope,
      email,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' })

    const redirectTo = companyId
      ? `/chat/${companyId}/settings?connected=true`
      : '/chat'

    const response = NextResponse.redirect(new URL(redirectTo, request.url))
    // cookieをクリア
    response.cookies.delete('google_oauth_state')
    response.cookies.delete('google_oauth_company')
    return response

  } catch {
    return NextResponse.redirect(new URL(`/chat/${companyId}/settings?error=true`, request.url))
  }
}

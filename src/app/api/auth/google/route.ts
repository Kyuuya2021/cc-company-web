import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildGoogleAuthUrl } from '@/lib/google/oauth'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth', request.url))

  const { searchParams } = request.nextUrl
  const companyId = searchParams.get('companyId') ?? ''

  // CSRFトークン生成（state）
  const state = crypto.randomUUID()

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  const authUrl = buildGoogleAuthUrl(state, redirectUri)

  const response = NextResponse.redirect(authUrl)

  // stateとcompanyIdをcookieに保存（60秒で失効）
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60,
    path: '/',
  })
  response.cookies.set('google_oauth_company', companyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60,
    path: '/',
  })

  return response
}

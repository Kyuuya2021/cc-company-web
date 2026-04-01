import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth', request.url))

  const { searchParams } = request.nextUrl
  const companyId = searchParams.get('companyId') ?? ''
  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    scope: 'repo issues:write',
    state,
  })

  const response = NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`)
  response.cookies.set('github_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60, path: '/' })
  response.cookies.set('github_oauth_company', companyId, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60, path: '/' })
  return response
}

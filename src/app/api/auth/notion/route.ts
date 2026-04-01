import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'node:crypto'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/auth', request.url))

    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId') ?? ''
    const state = randomUUID()

    if (!process.env.NOTION_CLIENT_ID) {
      return Response.json({ debug: 'NOTION_CLIENT_ID is not set' }, { status: 500 })
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/notion/callback`
    const params = new URLSearchParams({
      client_id: process.env.NOTION_CLIENT_ID,
      response_type: 'code',
      owner: 'user',
      redirect_uri: redirectUri,
      state,
    })

    const response = NextResponse.redirect(new URL(`https://api.notion.com/v1/oauth/authorize?${params}`))
    response.cookies.set('notion_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60, path: '/' })
    response.cookies.set('notion_oauth_company', companyId, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60, path: '/' })
    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ debug: 'notion route error', msg }, { status: 500 })
  }
}

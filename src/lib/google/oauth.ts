import { SupabaseClient } from '@supabase/supabase-js'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5分前にリフレッシュ

/** 有効なアクセストークンを返す（期限切れなら自動リフレッシュ） */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single()

  if (!data) return null

  const expiresAt = new Date(data.expires_at).getTime()
  if (Date.now() < expiresAt - REFRESH_BUFFER_MS) {
    return data.access_token
  }

  // リフレッシュ
  if (!data.refresh_token) return null
  return await refreshAccessToken(supabase, userId, data.refresh_token)
}

async function refreshAccessToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const tokens = await res.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
    .from('integrations')
    .update({ access_token: tokens.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', 'google')

  return tokens.access_token
}

/** Google OAuth認可URLを生成 */
export function buildGoogleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

/** codeをtokenに交換 */
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    }),
  })
  if (!res.ok) throw new Error('Token exchange failed')
  return await res.json()
}

/** アクセストークンからGoogleアカウントのメールを取得 */
export async function getGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  return data.email ?? ''
}

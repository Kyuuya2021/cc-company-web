const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

export interface GmailMessage {
  id: string
  subject: string
  from: string
  snippet: string
  date: string
  body?: string
}

/** Gmailを検索してメッセージ一覧を返す */
export async function searchMessages(
  accessToken: string,
  query: string,
  maxResults = 5
): Promise<GmailMessage[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) })
  const res = await fetch(`${GMAIL_BASE}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Gmail search error: ${res.status}`)
  const data = await res.json()
  if (!data.messages?.length) return []

  // 各メッセージの概要を取得
  const messages = await Promise.all(
    data.messages.slice(0, maxResults).map((m: { id: string }) => getMessageSummary(accessToken, m.id))
  )
  return messages.filter(Boolean) as GmailMessage[]
}

async function getMessageSummary(accessToken: string, messageId: string): Promise<GmailMessage | null> {
  const res = await fetch(`${GMAIL_BASE}/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  const headers = data.payload?.headers ?? []
  const get = (name: string) => headers.find((h: { name: string; value: string }) => h.name === name)?.value ?? ''
  return {
    id: data.id,
    subject: get('Subject'),
    from: get('From'),
    snippet: data.snippet ?? '',
    date: get('Date'),
  }
}

/** メールの本文を取得 */
export async function getMessage(accessToken: string, messageId: string): Promise<GmailMessage | null> {
  const res = await fetch(`${GMAIL_BASE}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  const headers = data.payload?.headers ?? []
  const get = (name: string) => headers.find((h: { name: string; value: string }) => h.name === name)?.value ?? ''

  const body = extractBody(data.payload)
  return {
    id: data.id,
    subject: get('Subject'),
    from: get('From'),
    snippet: data.snippet ?? '',
    date: get('Date'),
    body: body.slice(0, 2000), // 長すぎる場合は切り捨て
  }
}

function extractBody(payload: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }): string {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }
  if (payload.parts) {
    for (const part of payload.parts as typeof payload[]) {
      const text = extractBody(part)
      if (text) return text
    }
  }
  return ''
}

/** Gmailの下書きを作成 */
export async function createDraft(
  accessToken: string,
  { to, subject, body }: { to: string; subject: string; body: string }
): Promise<{ id: string }> {
  const raw = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n')

  const encoded = Buffer.from(raw).toString('base64url')

  const res = await fetch(`${GMAIL_BASE}/drafts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: { raw: encoded } }),
  })
  if (!res.ok) throw new Error(`Gmail draft error: ${res.status}`)
  return await res.json()
}

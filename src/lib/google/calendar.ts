const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  htmlLink?: string
}

/** 指定期間のカレンダー予定を取得 */
export async function listEvents(
  accessToken: string,
  {
    timeMin,
    timeMax,
    maxResults = 10,
    calendarId = 'primary',
  }: {
    timeMin?: string
    timeMax?: string
    maxResults?: number
    calendarId?: string
  } = {}
): Promise<CalendarEvent[]> {
  const now = new Date()
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
    timeMin: timeMin ?? now.toISOString(),
    timeMax: timeMax ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  const res = await fetch(`${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`)
  const data = await res.json()
  return data.items ?? []
}

/** カレンダーに予定を作成 */
export async function createEvent(
  accessToken: string,
  {
    summary,
    description,
    start,
    end,
    attendees,
    calendarId = 'primary',
  }: {
    summary: string
    description?: string
    start: string
    end: string
    attendees?: string[]
    calendarId?: string
  }
): Promise<CalendarEvent> {
  const body = {
    summary,
    description: description ?? '',
    start: { dateTime: start, timeZone: 'Asia/Tokyo' },
    end: { dateTime: end, timeZone: 'Asia/Tokyo' },
    ...(attendees?.length ? { attendees: attendees.map(email => ({ email })) } : {}),
  }

  const res = await fetch(`${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`)
  return await res.json()
}

/** カレンダーイベントを人間が読みやすいテキストに変換 */
export function formatEvents(events: CalendarEvent[]): string {
  if (events.length === 0) return '予定はありません。'
  return events
    .map(e => {
      const start = e.start.dateTime
        ? new Date(e.start.dateTime).toLocaleString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })
        : e.start.date ?? ''
      return `・${start} 「${e.summary}」`
    })
    .join('\n')
}

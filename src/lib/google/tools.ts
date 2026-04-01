import type Anthropic from '@anthropic-ai/sdk'

export const calendarTools: Anthropic.Tool[] = [
  {
    name: 'list_calendar_events',
    description: 'Google Calendarの予定を取得します。「今週の予定は？」「明日何がある？」などのリクエストに使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        time_min: {
          type: 'string',
          description: '取得開始日時（ISO 8601形式。例: 2026-04-01T00:00:00+09:00）。省略時は現在時刻',
        },
        time_max: {
          type: 'string',
          description: '取得終了日時（ISO 8601形式）。省略時は7日後',
        },
        max_results: {
          type: 'number',
          description: '最大取得件数（デフォルト10）',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Google Calendarに予定を作成します。「〇〇の予定を入れて」「ミーティングを登録して」などのリクエストに使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: {
          type: 'string',
          description: '予定のタイトル',
        },
        start: {
          type: 'string',
          description: '開始日時（ISO 8601形式。例: 2026-04-02T14:00:00+09:00）',
        },
        end: {
          type: 'string',
          description: '終了日時（ISO 8601形式）',
        },
        description: {
          type: 'string',
          description: '予定の詳細・メモ（任意）',
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: '招待する参加者のメールアドレスリスト（任意）',
        },
      },
      required: ['summary', 'start', 'end'],
    },
  },
]

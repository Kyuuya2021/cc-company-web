import type Anthropic from '@anthropic-ai/sdk'

export const gmailTools: Anthropic.Tool[] = [
  {
    name: 'search_gmail_messages',
    description: 'Gmailを検索してメール一覧を取得します。「〇〇からのメールを探して」「先週のメールを見せて」などに使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Gmail検索クエリ（例: "from:example@gmail.com", "subject:請求書", "is:unread"）',
        },
        max_results: { type: 'number', description: '最大取得件数（デフォルト5）' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_gmail_message',
    description: '特定のメールの本文を取得します。search_gmail_messagesで取得したIDを使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        message_id: { type: 'string', description: 'メールのID' },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'create_gmail_draft',
    description: 'Gmailの下書きを作成します。「〇〇宛にメールを書いて」などに使います。送信はせず下書き保存のみ行います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        to:      { type: 'string', description: '宛先メールアドレス' },
        subject: { type: 'string', description: '件名' },
        body:    { type: 'string', description: '本文' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
]

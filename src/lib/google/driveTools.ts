import type Anthropic from '@anthropic-ai/sdk'

export const driveTools: Anthropic.Tool[] = [
  {
    name: 'search_drive_files',
    description: 'Google Driveのファイルを検索します。「〇〇のドキュメントを探して」「提案書を見つけて」などに使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        query:       { type: 'string', description: '検索キーワード' },
        max_results: { type: 'number', description: '最大取得件数（デフォルト10）' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_drive_file_content',
    description: 'Google DriveのファイルやGoogleドキュメントの内容を取得します。search_drive_filesで取得したIDを使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        file_id: { type: 'string', description: 'ファイルのID' },
      },
      required: ['file_id'],
    },
  },
]

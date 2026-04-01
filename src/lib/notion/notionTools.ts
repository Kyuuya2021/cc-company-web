import type Anthropic from '@anthropic-ai/sdk'

export const notionTools: Anthropic.Tool[] = [
  {
    name: 'search_notion',
    description: 'Notionでページを検索します。「〇〇についてのNotionページを探して」「会社のWikiを検索して」などに使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: '検索キーワード' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_notion_page',
    description: 'Notionページの内容を取得します。search_notionで取得したIDを使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        page_id: { type: 'string', description: 'NotionページのID' },
      },
      required: ['page_id'],
    },
  },
  {
    name: 'create_notion_page',
    description: 'Notionに新しいページを作成します。「〇〇についてのページをNotionに作って」などに使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        parent_page_id: { type: 'string', description: '親ページのID（どのページの下に作るか）' },
        title:          { type: 'string', description: 'ページのタイトル' },
        content:        { type: 'string', description: 'ページの内容（改行区切りで複数段落可）' },
      },
      required: ['parent_page_id', 'title', 'content'],
    },
  },
]

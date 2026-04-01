import type Anthropic from '@anthropic-ai/sdk'

export const githubTools: Anthropic.Tool[] = [
  {
    name: 'list_github_issues',
    description: 'GitHubリポジトリのIssue一覧を取得します。「〇〇リポジトリのバグ一覧を見せて」などに使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        repo:  { type: 'string', description: 'リポジトリ（owner/repo形式。例: acme/my-app）' },
        state: { type: 'string', description: 'ステータス: open / closed / all（デフォルト: open）', enum: ['open', 'closed', 'all'] },
      },
      required: ['repo'],
    },
  },
  {
    name: 'create_github_issue',
    description: 'GitHubにIssueを作成します。「〇〇リポジトリにバグ報告を作って」などに使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        repo:  { type: 'string', description: 'リポジトリ（owner/repo形式）' },
        title: { type: 'string', description: 'Issueのタイトル' },
        body:  { type: 'string', description: 'Issueの詳細（任意）' },
      },
      required: ['repo', 'title'],
    },
  },
  {
    name: 'list_github_pull_requests',
    description: 'GitHubリポジトリのPull Request一覧を取得します。「〇〇のPRを確認して」などに使います。',
    input_schema: {
      type: 'object' as const,
      properties: {
        repo:  { type: 'string', description: 'リポジトリ（owner/repo形式）' },
        state: { type: 'string', description: 'ステータス: open / closed / all（デフォルト: open）', enum: ['open', 'closed', 'all'] },
      },
      required: ['repo'],
    },
  },
]

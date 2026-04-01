import { DepartmentSlug } from './departments'

interface PromptContext {
  company: { business_type: string; goals_challenges: string } | null
  today: string
  todos: { done: boolean; content: string }[]
  recentNotes: { note_type: string; title: string; content: string; date: string; department: string }[]
  activeDepartments: { slug: string; name: string; description: string }[]
  departmentData: DepartmentData
  suggestedDepts?: string[]
}

interface DepartmentData {
  projects?: { name: string; status: string }[]
  tickets?: { title: string; status: string }[]
  clients?: { name: string; status: string }[]
  expenses?: { description: string; amount: number; date: string }[]
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const { company, today, todos, recentNotes, activeDepartments, departmentData, suggestedDepts } = ctx

  const activeSlugs = activeDepartments.map(d => d.slug)

  const departmentSection = activeDepartments.length > 0
    ? activeDepartments.map(d => `- ${d.name}（${d.slug}）: ${d.description}`).join('\n')
    : '（秘書室のみ）'

  const projectsSection = activeSlugs.includes('pm') && departmentData.projects?.length
    ? `\n【プロジェクト一覧】\n${departmentData.projects.map(p => `- [${p.status}] ${p.name}`).join('\n')}`
    : ''

  const clientsSection = activeSlugs.includes('sales') && departmentData.clients?.length
    ? `\n【クライアント一覧】\n${departmentData.clients.map(c => `- [${c.status}] ${c.name}`).join('\n')}`
    : ''

  const expensesSection = activeSlugs.includes('accounting') && departmentData.expenses?.length
    ? `\n【最近の経費】\n${departmentData.expenses.map(e => `- ${e.date} ${e.description} ¥${e.amount.toLocaleString()}`).join('\n')}`
    : ''

  return `あなたはCC Companyの統合AIです。秘書として窓口を担いながら、メッセージの内容に応じて最適な部署が対応します。

【言語対応】
ユーザーのメッセージの言語を自動検出し、必ず同じ言語で返答してください。
日本語で話しかけられたら日本語で、英語で話しかけられたら英語で、他の言語でも同様に合わせてください。
固定のUIテキスト以外はすべてユーザーの言語に揃えてください。

【オーナー情報】
- 事業・活動: ${company?.business_type || '未設定'}
- 目標・困りごと: ${company?.goals_challenges || '未設定'}

【今日のTODO (${today})】
${todos.length > 0 ? todos.map(t => `- [${t.done ? 'x' : ' '}] ${t.content}`).join('\n') : '（なし）'}

【アクティブな部署】
${departmentSection}
${projectsSection}${clientsSection}${expensesSection}

【最近のメモ】
${recentNotes.length > 0
  ? recentNotes.map(n => `[${n.note_type}/${n.department}] ${n.title || n.date}: ${n.content.slice(0, 60)}...`).join('\n')
  : '（なし）'}

【部署振り分けルール】
メッセージの内容から最も適切な担当部署を選んでください：
- secretary（秘書室）: TODO・メモ・壁打ち・相談・雑談・その他
- pm: プロジェクト・マイルストーン・進捗・スケジュール・チケット
- research: 調査・競合・市場・トレンド・リサーチ
- marketing: コンテンツ・SNS・ブログ・集客・広告・LP
- dev: 実装・設計・バグ・デバッグ・技術・アーキテクチャ
- accounting: 請求・経費・売上・入金・確定申告・インボイス
- sales: クライアント・提案・見積・案件・商談
- creative: デザイン・ロゴ・バナー・ブランド・ビジュアル
- hr: 採用・チーム・メンバー・オンボーディング

【部署が存在しない場合のルール】
- 担当部署がアクティブでない場合、秘書室が対応しつつ「〇〇部署を作りましょうか？」と提案してください
- 同じ領域のタスクが繰り返される場合は積極的に部署新設を提案してください
${suggestedDepts && suggestedDepts.length > 0
  ? `\n【⚠️ 部署新設の提案タイミング】\n以下の部署への対応がすでに複数回発生していますが、まだ作成されていません。今回の返答の中で自然に部署新設を提案してください：\n${suggestedDepts.map(s => `- ${s}`).join('\n')}\nユーザーが同意したら add_department アクションを実行してください。`
  : ''}

【口調・キャラクター】
- 丁寧だが親しみやすい口調（「〜ですね！」「承知しました」「いいですね！」）
- 主体的に提案する（「ついでにこれもやっておきましょうか？」）
- 対応部署が変わる場合は「〇〇部署が対応します」と自然に伝える

【外部ツール連携の提案】
以下のタイミングで、外部サービスとの連携を自然に提案してください（押しつけがましくなく一言程度で）：
- スケジュール・予定・カレンダーの話題 → Google Calendar との連携を提案
- ドキュメント・ナレッジ・Wiki・メモ整理の話題 → Notion との連携を提案
- コード・Issue・PR・リポジトリ・GitHub の話題 → GitHub との連携を提案
- チーム連絡・通知・コミュニケーションの話題 → Slack との連携を提案
- ユーザーが「〇〇と連携したい」「MCP連携」と言った場合 → 即座に具体的な活用イメージを提案

提案例: 「Google Calendar と連携すると、ここからスケジュール管理もできるようになりますよ！ご興味ありますか？」

【アクション形式】
実行すべきアクションがある場合、会話テキストの後に必ず以下のJSONブロックを出力してください：

\`\`\`action
{
  "department": "secretary" | "pm" | "research" | "marketing" | "dev" | "accounting" | "sales" | "creative" | "hr",
  "actions": [
    {
      "type": "アクション名",
      "data": {}
    }
  ]
}
\`\`\`

利用可能なアクション：
- add_todo: { "content": "タスク内容" }
- complete_todo: { "id": "todo_id" }
- add_note: { "title": "タイトル", "content": "内容", "note_type": "note|idea|decision|inbox" }
- add_department: { "name": "部署名", "description": "説明", "slug": "pm|research|marketing|dev|accounting|sales|creative|hr", "icon": "絵文字", "color": "色" }
- add_project: { "name": "プロジェクト名", "description": "説明" }
- add_ticket: { "title": "チケット名", "description": "説明", "project_id": "任意" }
- add_client: { "name": "クライアント名", "contact": "連絡先", "notes": "メモ" }
- add_expense: { "amount": 金額（数値）, "description": "内容", "category": "カテゴリ" }

アクションがない場合は\`\`\`actionブロックを省略してください。
複数のアクションがある場合はactionsの配列に追加してください。

【今日の日付】${today}`
}

export function detectDepartment(message: string): DepartmentSlug {
  const lower = message.toLowerCase()
  const keywords: [DepartmentSlug, string[]][] = [
    ['pm',         ['プロジェクト', 'マイルストーン', '進捗', 'スケジュール', 'チケット']],
    ['research',   ['調べて', '調査', '競合', '市場', 'トレンド', 'リサーチ']],
    ['marketing',  ['コンテンツ', 'sns', 'ブログ', '集客', '広告', 'lp', 'マーケ']],
    ['dev',        ['実装', '設計', 'バグ', 'デバッグ', '技術', 'アーキテクチャ', 'コード']],
    ['accounting', ['請求', '経費', '売上', '入金', '確定申告', 'インボイス']],
    ['sales',      ['クライアント', '提案', '見積', '案件', '商談', '営業']],
    ['creative',   ['デザイン', 'ロゴ', 'バナー', 'ブランド', 'ビジュアル']],
    ['hr',         ['採用', 'チーム', 'メンバー', 'オンボーディング', '人事']],
  ]
  for (const [dept, kws] of keywords) {
    if (kws.some(kw => lower.includes(kw))) return dept
  }
  return 'secretary'
}

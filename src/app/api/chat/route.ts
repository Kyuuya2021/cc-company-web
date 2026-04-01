import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt } from '@/lib/agents/prompts'
import { getValidAccessToken } from '@/lib/google/oauth'
import { listEvents, createEvent, formatEvents } from '@/lib/google/calendar'
import { calendarTools } from '@/lib/google/tools'
import { searchMessages, getMessage, createDraft } from '@/lib/google/gmail'
import { searchFiles, getFileContent } from '@/lib/google/drive'
import { gmailTools } from '@/lib/google/gmailTools'
import { driveTools } from '@/lib/google/driveTools'
import { searchNotion, getPage, createPage } from '@/lib/notion/notion'
import { notionTools } from '@/lib/notion/notionTools'
import { listIssues, createIssue, listPullRequests } from '@/lib/github/github'
import { githubTools } from '@/lib/github/githubTools'
import { getIntegrationToken } from '@/lib/integrations/getToken'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history, companyId } = await request.json()
  if (!companyId) return Response.json({ error: 'companyId required' }, { status: 400 })

  const { data: company } = await supabase
    .from('companies')
    .select('business_type, goals_challenges, name')
    .eq('id', companyId)
    .eq('user_id', user.id)
    .single()

  if (!company) return Response.json({ error: 'Not found' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: todos },
    { data: recentNotes },
    { data: activeDepartments },
    { data: projects },
    { data: clients },
    { data: expenses },
    { data: recentMessages },
  ] = await Promise.all([
    supabase.from('todos').select('*').eq('company_id', companyId).eq('user_id', user.id).eq('date', today).order('created_at', { ascending: true }),
    supabase.from('notes').select('title, content, note_type, date, department').eq('company_id', companyId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('departments').select('name, description, slug, icon, color').eq('company_id', companyId).eq('user_id', user.id),
    supabase.from('projects').select('name, status').eq('company_id', companyId).eq('user_id', user.id).limit(5),
    supabase.from('clients').select('name, status').eq('company_id', companyId).eq('user_id', user.id).limit(5),
    supabase.from('expenses').select('description, amount, date').eq('company_id', companyId).eq('user_id', user.id).order('date', { ascending: false }).limit(5),
    supabase.from('messages').select('department').eq('company_id', companyId).eq('user_id', user.id).eq('role', 'assistant').neq('department', 'secretary').order('created_at', { ascending: false }).limit(30),
  ])

  // 部署別の対応回数をカウント（未作成部署で2回以上 → 提案候補）
  const deptCounts: Record<string, number> = {}
  for (const msg of recentMessages ?? []) {
    if (msg.department) {
      deptCounts[msg.department] = (deptCounts[msg.department] || 0) + 1
    }
  }
  const activeSlugs = new Set((activeDepartments ?? []).map((d: { slug: string }) => d.slug))
  const suggestedDepts = Object.entries(deptCounts)
    .filter(([slug, count]) => count >= 2 && !activeSlugs.has(slug))
    .map(([slug]) => slug)

  const systemPrompt = buildSystemPrompt({
    company: { business_type: company.business_type, goals_challenges: company.goals_challenges },
    today,
    todos: todos ?? [],
    recentNotes: recentNotes ?? [],
    activeDepartments: activeDepartments ?? [],
    departmentData: { projects: projects ?? [], clients: clients ?? [], expenses: expenses ?? [] },
    suggestedDepts,
  })

  // 各サービスのトークンを並列取得
  const [calendarAccessToken, notionToken, githubToken] = await Promise.all([
    getValidAccessToken(supabase, user.id).catch(() => null),
    getIntegrationToken(supabase, user.id, 'notion'),
    getIntegrationToken(supabase, user.id, 'github'),
  ])

  // Google token は Calendar / Gmail / Drive に共通
  const googleToken = calendarAccessToken

  const tools: Anthropic.Tool[] = [
    ...(googleToken ? [...calendarTools, ...gmailTools, ...driveTools] : []),
    ...(notionToken ? notionTools : []),
    ...(githubToken ? githubTools : []),
  ]

  const messages: Anthropic.MessageParam[] = [
    ...(history || []),
    { role: 'user' as const, content: message },
  ]

  // Claude 呼び出し（tool_use対応・最大2ラウンド）
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    ...(tools.length > 0 ? { tools } : {}),
    messages,
  })

  // tool_use が発生した場合の処理
  if (response.stop_reason === 'tool_use' && tools.length > 0) {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      let resultContent = ''
      try {
        // --- Google Calendar ---
        if (toolUse.name === 'list_calendar_events' && googleToken) {
          const input = toolUse.input as { time_min?: string; time_max?: string; max_results?: number }
          const events = await listEvents(googleToken, { timeMin: input.time_min, timeMax: input.time_max, maxResults: input.max_results })
          resultContent = formatEvents(events)
        } else if (toolUse.name === 'create_calendar_event' && googleToken) {
          const input = toolUse.input as { summary: string; start: string; end: string; description?: string; attendees?: string[] }
          const event = await createEvent(googleToken, { summary: input.summary, start: input.start, end: input.end, description: input.description, attendees: input.attendees })
          resultContent = `予定「${event.summary}」を作成しました。`

        // --- Gmail ---
        } else if (toolUse.name === 'search_gmail_messages' && googleToken) {
          const input = toolUse.input as { query: string; max_results?: number }
          const msgs = await searchMessages(googleToken, input.query, input.max_results)
          resultContent = JSON.stringify(msgs)
        } else if (toolUse.name === 'read_gmail_message' && googleToken) {
          const input = toolUse.input as { message_id: string }
          const msg = await getMessage(googleToken, input.message_id)
          resultContent = JSON.stringify(msg)
        } else if (toolUse.name === 'create_gmail_draft' && googleToken) {
          const input = toolUse.input as { to: string; subject: string; body: string }
          await createDraft(googleToken, input)
          resultContent = `下書きを作成しました（宛先: ${input.to}、件名: ${input.subject}）`

        // --- Google Drive ---
        } else if (toolUse.name === 'search_drive_files' && googleToken) {
          const input = toolUse.input as { query: string; max_results?: number }
          const files = await searchFiles(googleToken, input.query, input.max_results)
          resultContent = JSON.stringify(files)
        } else if (toolUse.name === 'get_drive_file_content' && googleToken) {
          const input = toolUse.input as { file_id: string }
          resultContent = await getFileContent(googleToken, input.file_id)

        // --- Notion ---
        } else if (toolUse.name === 'search_notion' && notionToken) {
          const input = toolUse.input as { query: string }
          const results = await searchNotion(notionToken, input.query)
          resultContent = JSON.stringify(results)
        } else if (toolUse.name === 'get_notion_page' && notionToken) {
          const input = toolUse.input as { page_id: string }
          const page = await getPage(notionToken, input.page_id)
          resultContent = JSON.stringify(page)
        } else if (toolUse.name === 'create_notion_page' && notionToken) {
          const input = toolUse.input as { parent_page_id: string; title: string; content?: string }
          const page = await createPage(notionToken, { parentPageId: input.parent_page_id, title: input.title, content: input.content })
          resultContent = `Notionページ「${input.title}」を作成しました。URL: ${page.url}`

        // --- GitHub ---
        } else if (toolUse.name === 'list_github_issues' && githubToken) {
          const input = toolUse.input as { repo: string; state?: string }
          const issues = await listIssues(githubToken, input)
          resultContent = JSON.stringify(issues)
        } else if (toolUse.name === 'create_github_issue' && githubToken) {
          const input = toolUse.input as { repo: string; title: string; body?: string }
          const issue = await createIssue(githubToken, input)
          resultContent = `Issue #${issue.number} を作成しました。URL: ${issue.url}`
        } else if (toolUse.name === 'list_github_pull_requests' && githubToken) {
          const input = toolUse.input as { repo: string; state?: string }
          const prs = await listPullRequests(githubToken, input)
          resultContent = JSON.stringify(prs)
        } else {
          resultContent = 'ツールの実行に失敗しました。'
        }
      } catch {
        resultContent = `${toolUse.name} の実行中にエラーが発生しました。`
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: resultContent,
      })
    }

    // Round 2: tool_result を渡して最終回答を取得
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: [
        ...messages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ],
    })
  }

  const textBlock = response.content.find(b => b.type === 'text')
  const assistantText = textBlock?.type === 'text' ? textBlock.text : ''

  let department = 'secretary'
  const actionMatch = assistantText.match(/```action\n([\s\S]*?)\n```/)
  if (actionMatch) {
    try {
      const parsed = JSON.parse(actionMatch[1])
      department = parsed.department || 'secretary'
      const actions = Array.isArray(parsed.actions) ? parsed.actions : []
      for (const action of actions) {
        await executeAction(supabase, user.id, companyId, action, today)
      }
    } catch {
      // パースエラーは無視
    }
  }

  await supabase.from('messages').insert({ user_id: user.id, company_id: companyId, role: 'user', content: message, department: 'secretary' })
  await supabase.from('messages').insert({ user_id: user.id, company_id: companyId, role: 'assistant', content: assistantText, department })

  return Response.json({ reply: assistantText, department })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeAction(supabase: any, userId: string, companyId: string, action: { type: string; data: Record<string, unknown> }, today: string) {
  const base = { user_id: userId, company_id: companyId }
  switch (action.type) {
    case 'add_todo':
      await supabase.from('todos').insert({ ...base, content: action.data.content, date: today })
      break
    case 'complete_todo':
      await supabase.from('todos').update({ done: true }).eq('id', action.data.id).eq('user_id', userId).eq('company_id', companyId)
      break
    case 'add_note':
      await supabase.from('notes').insert({ ...base, title: action.data.title, content: action.data.content, note_type: action.data.note_type || 'note', department: action.data.department || 'secretary', date: today })
      break
    case 'add_department':
      await supabase.from('departments').insert({ ...base, name: action.data.name, description: action.data.description, slug: action.data.slug, icon: action.data.icon, color: action.data.color })
      break
    case 'add_project':
      await supabase.from('projects').insert({ ...base, name: action.data.name, description: action.data.description })
      break
    case 'add_ticket':
      await supabase.from('tickets').insert({ ...base, title: action.data.title, description: action.data.description, project_id: action.data.project_id || null })
      break
    case 'add_client':
      await supabase.from('clients').insert({ ...base, name: action.data.name, contact: action.data.contact, notes: action.data.notes })
      break
    case 'add_expense':
      await supabase.from('expenses').insert({ ...base, amount: action.data.amount, description: action.data.description, category: action.data.category, date: today })
      break
  }
}

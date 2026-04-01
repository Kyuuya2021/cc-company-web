const NOTION_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

function notionHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

export interface NotionPage {
  id: string
  title: string
  url: string
  lastEdited: string
}

/** Notionページを検索 */
export async function searchNotion(accessToken: string, query: string): Promise<NotionPage[]> {
  const res = await fetch(`${NOTION_BASE}/search`, {
    method: 'POST',
    headers: notionHeaders(accessToken),
    body: JSON.stringify({
      query,
      filter: { value: 'page', property: 'object' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 10,
    }),
  })
  if (!res.ok) throw new Error(`Notion search error: ${res.status}`)
  const data = await res.json()

  return (data.results ?? []).map((page: {
    id: string
    url: string
    last_edited_time: string
    properties?: { title?: { title?: { plain_text: string }[] } }
    title?: { plain_text: string }[]
  }) => ({
    id: page.id,
    title: extractTitle(page),
    url: page.url,
    lastEdited: page.last_edited_time,
  }))
}

function extractTitle(page: {
  properties?: { title?: { title?: { plain_text: string }[] } }
  title?: { plain_text: string }[]
}): string {
  // ページタイプのtitle取得
  const titleProp = page.properties?.title?.title
  if (titleProp?.length) return titleProp.map((t: { plain_text: string }) => t.plain_text).join('')
  // データベースアイテムの場合
  if (page.title?.length) return page.title.map((t: { plain_text: string }) => t.plain_text).join('')
  return '（無題）'
}

/** Notionページの内容を取得 */
export async function getPage(accessToken: string, pageId: string): Promise<{ title: string; content: string; url: string }> {
  const [pageRes, blocksRes] = await Promise.all([
    fetch(`${NOTION_BASE}/pages/${pageId}`, { headers: notionHeaders(accessToken) }),
    fetch(`${NOTION_BASE}/blocks/${pageId}/children?page_size=50`, { headers: notionHeaders(accessToken) }),
  ])
  if (!pageRes.ok) throw new Error(`Notion page error: ${pageRes.status}`)
  const page = await pageRes.json()
  const blocks = blocksRes.ok ? await blocksRes.json() : { results: [] }

  const title = extractTitle(page)
  const content = (blocks.results ?? [])
    .map(extractBlockText)
    .filter(Boolean)
    .join('\n')
    .slice(0, 3000)

  return { title, content, url: page.url }
}

function extractBlockText(block: {
  type: string
  [key: string]: { rich_text?: { plain_text: string }[] } | string
}): string {
  const type = block.type as string
  const content = block[type] as { rich_text?: { plain_text: string }[] }
  if (!content?.rich_text) return ''
  return content.rich_text.map((t: { plain_text: string }) => t.plain_text).join('')
}

/** Notionに新しいページを作成 */
export async function createPage(
  accessToken: string,
  { parentPageId, title, content }: { parentPageId: string; title: string; content?: string }
): Promise<{ url: string }> {
  const paragraphs = (content ?? '').split('\n').filter(Boolean).map(line => ({
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: line } }] },
  }))

  const res = await fetch(`${NOTION_BASE}/pages`, {
    method: 'POST',
    headers: notionHeaders(accessToken),
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: {
        title: { title: [{ type: 'text', text: { content: title } }] },
      },
      children: paragraphs,
    }),
  })
  if (!res.ok) throw new Error(`Notion create error: ${res.status}`)
  const data = await res.json()
  return { url: data.url }
}

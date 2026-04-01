const DRIVE_BASE = 'https://www.googleapis.com/drive/v3'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string
  modifiedTime: string
}

/** Google Driveのファイルを検索 */
export async function searchFiles(
  accessToken: string,
  query: string,
  maxResults = 10
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `fullText contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
    fields: 'files(id,name,mimeType,webViewLink,modifiedTime)',
    pageSize: String(maxResults),
    orderBy: 'modifiedTime desc',
  })
  const res = await fetch(`${DRIVE_BASE}/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Drive search error: ${res.status}`)
  const data = await res.json()
  return data.files ?? []
}

/** ファイルの内容を取得（Google Docs/Sheets はテキスト変換） */
export async function getFileContent(accessToken: string, fileId: string): Promise<string> {
  // まずメタデータを取得
  const metaRes = await fetch(`${DRIVE_BASE}/files/${fileId}?fields=name,mimeType,webViewLink`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!metaRes.ok) throw new Error(`Drive file error: ${metaRes.status}`)
  const meta = await metaRes.json()

  const exportableMimes: Record<string, string> = {
    'application/vnd.google-apps.document':     'text/plain',
    'application/vnd.google-apps.spreadsheet':  'text/csv',
    'application/vnd.google-apps.presentation': 'text/plain',
  }

  const exportMime = exportableMimes[meta.mimeType]
  if (exportMime) {
    const exportRes = await fetch(`${DRIVE_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!exportRes.ok) return `ファイル「${meta.name}」を取得できませんでした。`
    const text = await exportRes.text()
    return text.slice(0, 3000) // 長すぎる場合は切り捨て
  }

  // Googleドキュメント以外はリンクのみ返す
  return `ファイル「${meta.name}」（${meta.mimeType}）\n閲覧: ${meta.webViewLink}`
}

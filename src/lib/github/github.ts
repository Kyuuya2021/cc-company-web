const GITHUB_BASE = 'https://api.github.com'

function githubHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export interface GitHubIssue {
  number: number
  title: string
  state: string
  url: string
  createdAt: string
  labels: string[]
}

export interface GitHubPR {
  number: number
  title: string
  state: string
  url: string
  createdAt: string
}

/** リポジトリのIssue一覧を取得 */
export async function listIssues(
  accessToken: string,
  { repo, state = 'open' }: { repo: string; state?: string }
): Promise<GitHubIssue[]> {
  const [owner, repoName] = repo.split('/')
  if (!owner || !repoName) throw new Error('repo は owner/repo 形式で指定してください')

  const params = new URLSearchParams({ state, per_page: '20' })
  const res = await fetch(`${GITHUB_BASE}/repos/${owner}/${repoName}/issues?${params}`, {
    headers: githubHeaders(accessToken),
  })
  if (!res.ok) throw new Error(`GitHub issues error: ${res.status}`)
  const data = await res.json()

  return data
    .filter((i: { pull_request?: unknown }) => !i.pull_request) // PRを除外
    .map((i: { number: number; title: string; state: string; html_url: string; created_at: string; labels: { name: string }[] }) => ({
      number: i.number,
      title: i.title,
      state: i.state,
      url: i.html_url,
      createdAt: i.created_at,
      labels: i.labels.map((l: { name: string }) => l.name),
    }))
}

/** GitHubにIssueを作成 */
export async function createIssue(
  accessToken: string,
  { repo, title, body }: { repo: string; title: string; body?: string }
): Promise<{ number: number; url: string }> {
  const [owner, repoName] = repo.split('/')
  if (!owner || !repoName) throw new Error('repo は owner/repo 形式で指定してください')

  const res = await fetch(`${GITHUB_BASE}/repos/${owner}/${repoName}/issues`, {
    method: 'POST',
    headers: { ...githubHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body: body ?? '' }),
  })
  if (!res.ok) throw new Error(`GitHub create issue error: ${res.status}`)
  const data = await res.json()
  return { number: data.number, url: data.html_url }
}

/** リポジトリのPR一覧を取得 */
export async function listPullRequests(
  accessToken: string,
  { repo, state = 'open' }: { repo: string; state?: string }
): Promise<GitHubPR[]> {
  const [owner, repoName] = repo.split('/')
  if (!owner || !repoName) throw new Error('repo は owner/repo 形式で指定してください')

  const params = new URLSearchParams({ state, per_page: '20' })
  const res = await fetch(`${GITHUB_BASE}/repos/${owner}/${repoName}/pulls?${params}`, {
    headers: githubHeaders(accessToken),
  })
  if (!res.ok) throw new Error(`GitHub PRs error: ${res.status}`)
  const data = await res.json()

  return data.map((pr: { number: number; title: string; state: string; html_url: string; created_at: string }) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.html_url,
    createdAt: pr.created_at,
  }))
}

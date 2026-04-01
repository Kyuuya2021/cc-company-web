import { SupabaseClient } from '@supabase/supabase-js'

/** Notion・GitHubなど期限なしのトークンを取得する汎用関数 */
export async function getIntegrationToken(
  supabase: SupabaseClient,
  userId: string,
  provider: string
): Promise<string | null> {
  const { data } = await supabase
    .from('integrations')
    .select('access_token')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single()

  return data?.access_token ?? null
}

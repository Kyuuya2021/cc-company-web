-- =============================================
-- integrations テーブル（外部サービス連携）
-- Supabase SQL Editorでこのファイルを実行してください
-- =============================================
create table integrations (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  provider      text not null,        -- 'google_calendar'
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz not null,
  scope         text,
  email         text,                 -- 連携したGoogleアカウントのメール
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, provider)
);

alter table integrations enable row level security;
create policy "自分のインテグレーションのみ" on integrations
  for all using (auth.uid() = user_id);

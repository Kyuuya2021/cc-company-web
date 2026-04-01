-- =============================================
-- 既存テーブルを全削除（リセット）
-- ※依存関係の逆順に DROP する
-- =============================================
drop table if exists expenses cascade;
drop table if exists clients cascade;
drop table if exists tickets cascade;
drop table if exists projects cascade;
drop table if exists departments cascade;
drop table if exists notes cascade;
drop table if exists todos cascade;
drop table if exists messages cascade;
drop table if exists companies cascade;
drop table if exists profiles cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

-- =============================================
-- profiles テーブル（ユーザー情報 + オンボーディング）
-- =============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  business_type text,
  goals_challenges text,
  onboarding_completed boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "自分のプロフィールのみ" on profiles
  for all using (auth.uid() = id);

-- =============================================
-- companies テーブル（会社・プロジェクト管理）
-- =============================================
create table companies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  business_type text,
  goals_challenges text,
  created_at timestamptz default now()
);

alter table companies enable row level security;
create policy "自分の会社のみ" on companies
  for all using (auth.uid() = user_id);

-- =============================================
-- messages テーブル（チャット履歴）
-- =============================================
create table messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  department text default 'secretary',
  created_at timestamptz default now()
);

alter table messages enable row level security;
create policy "自分のメッセージのみ" on messages
  for all using (auth.uid() = user_id);

-- =============================================
-- todos テーブル
-- =============================================
create table todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  content text not null,
  done boolean default false,
  date date default current_date,
  created_at timestamptz default now()
);

alter table todos enable row level security;
create policy "自分のTODOのみ" on todos
  for all using (auth.uid() = user_id);

-- =============================================
-- notes テーブル（メモ・決定事項・アイデア）
-- =============================================
create table notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  title text,
  content text not null,
  note_type text default 'note' check (note_type in ('note', 'decision', 'idea', 'inbox')),
  department text default 'secretary',
  date date default current_date,
  created_at timestamptz default now()
);

alter table notes enable row level security;
create policy "自分のノートのみ" on notes
  for all using (auth.uid() = user_id);

-- =============================================
-- departments テーブル（部署管理）
-- =============================================
create table departments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  name text not null,
  description text,
  slug text,
  icon text,
  color text,
  created_at timestamptz default now()
);

alter table departments enable row level security;
create policy "自分の部署のみ" on departments
  for all using (auth.uid() = user_id);

-- =============================================
-- projects テーブル（PM部署）
-- =============================================
create table projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  name text not null,
  description text,
  status text default 'active' check (status in ('active', 'completed', 'paused')),
  created_at timestamptz default now()
);

alter table projects enable row level security;
create policy "自分のプロジェクトのみ" on projects
  for all using (auth.uid() = user_id);

-- =============================================
-- tickets テーブル（PM部署）
-- =============================================
create table tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  title text not null,
  description text,
  status text default 'open' check (status in ('open', 'in_progress', 'done')),
  created_at timestamptz default now()
);

alter table tickets enable row level security;
create policy "自分のチケットのみ" on tickets
  for all using (auth.uid() = user_id);

-- =============================================
-- clients テーブル（営業部署）
-- =============================================
create table clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  name text not null,
  contact text,
  status text default 'active' check (status in ('active', 'prospect', 'inactive')),
  notes text,
  created_at timestamptz default now()
);

alter table clients enable row level security;
create policy "自分のクライアントのみ" on clients
  for all using (auth.uid() = user_id);

-- =============================================
-- expenses テーブル（経理部署）
-- =============================================
create table expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  amount integer not null,
  description text not null,
  category text,
  date date default current_date,
  created_at timestamptz default now()
);

alter table expenses enable row level security;
create policy "自分の経費のみ" on expenses
  for all using (auth.uid() = user_id);

-- =============================================
-- profiles の自動作成トリガー
-- =============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

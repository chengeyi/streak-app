-- Supabase schema：打卡 + 連勝 + 小組排行榜
-- 貼到 Supabase SQL Editor 執行即可

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null,
  is_pro boolean not null default false,
  created_at timestamptz not null default now()
);

-- 挑戰（例如：每天刷一題 LeetCode）
create table challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

-- 小組（排行榜的單位）
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- 使用者加入某個挑戰，並記錄連勝快取
create table participations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  challenge_id uuid not null references challenges(id) on delete cascade,
  group_id uuid references groups(id) on delete set null,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  freeze_cards int not null default 0,       -- 連勝保護卡（Pro 賣點）
  last_checkin_date date,
  created_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

-- 每日打卡紀錄（一人一挑戰一天只能一筆）
create table checkins (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references participations(id) on delete cascade,
  checkin_date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (participation_id, checkin_date)
);

-- 排行榜 view
create view group_leaderboard as
select
  p.group_id,
  pr.nickname,
  p.user_id,
  p.current_streak,
  p.longest_streak
from participations p
join profiles pr on pr.id = p.user_id
where p.group_id is not null
order by p.current_streak desc;

-- Row Level Security
alter table profiles enable row level security;
alter table challenges enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table participations enable row level security;
alter table checkins enable row level security;

create policy "本人可讀寫 profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "同組成員可看彼此 profile" on profiles
  for select using (
    id in (
      select gm2.user_id from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
    )
  );

create policy "擁有者管理挑戰" on challenges
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "公開挑戰所有人可看" on challenges
  for select using (is_public);

create policy "成員可看小組" on groups
  for select using (
    id in (select group_id from group_members where user_id = auth.uid())
  );

create policy "建立小組" on groups
  for insert with check (auth.uid() = owner_id);

create policy "本人管理自己的成員資格" on group_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "本人管理自己的參與" on participations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "同組可看彼此參與（排行榜）" on participations
  for select using (
    group_id in (select group_id from group_members where user_id = auth.uid())
  );

create policy "本人管理自己的打卡" on checkins
  for all using (
    participation_id in (select id from participations where user_id = auth.uid())
  ) with check (
    participation_id in (select id from participations where user_id = auth.uid())
  );

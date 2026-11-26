-- migration-01：修正權限問題 + 加入小組功能
-- 在 schema.sql 之後，貼到 Supabase SQL Editor 執行

-- 1. 排行榜 view 預設會繞過 RLS，任何人都能看到所有小組。改成依呼叫者權限執行。
alter view group_leaderboard set (security_invoker = true);

-- 2. 取得「我所屬小組」的輔助函式（避免 RLS 自我遞迴）
create or replace function my_group_ids()
returns setof uuid
language sql security definer stable
set search_path = public
as $$
  select group_id from group_members where user_id = auth.uid()
$$;

-- 3. 同組成員可看彼此的成員資格（否則排行榜看不到別人的暱稱）
create policy "同組可看成員" on group_members
  for select using (group_id in (select my_group_ids()));

drop policy "同組成員可看彼此 profile" on profiles;
create policy "同組成員可看彼此 profile" on profiles
  for select using (
    id in (
      select user_id from group_members
      where group_id in (select my_group_ids())
    )
  );

-- 4. 建立小組後，擁有者要能讀到自己剛建的小組（insert ... returning 需要）
create policy "擁有者可看小組" on groups
  for select using (owner_id = auth.uid());

-- 5. 用邀請碼加入小組（非成員讀不到 groups，所以用 security definer 函式）
create or replace function join_group(code text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare gid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select id into gid from groups where invite_code = code;
  if gid is null then
    raise exception 'invalid invite code';
  end if;
  insert into group_members (group_id, user_id)
  values (gid, auth.uid())
  on conflict do nothing;
  return gid;
end;
$$;

revoke execute on function join_group(text) from public, anon;
grant execute on function join_group(text) to authenticated;

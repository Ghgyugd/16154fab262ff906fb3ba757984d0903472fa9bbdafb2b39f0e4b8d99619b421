begin;

create or replace function public.consume_scan_quota(p_user_id text)
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_limit integer;
  v_used integer;
begin
  select greatest(0, free_tier_monthly_limit)
    into v_limit
    from public.system_settings
    where id = 'singleton';
  v_limit := coalesce(v_limit, 3);

  select * into v_user
    from public.users
    where id = p_user_id
    for update;

  if not found then
    return query select false, 0;
    return;
  end if;

  if v_user.current_plan = 'FREE' and v_user.credit_reset_date <= now() then
    update public.users
      set monthly_scans_used = 0,
          credit_reset_date = now() + interval '30 days'
      where id = p_user_id;
    v_user.monthly_scans_used := 0;
  end if;

  if v_user.current_plan = 'PRO' then
    update public.users
      set monthly_scans_used = monthly_scans_used + 1
      where id = p_user_id;
    return query select true, 9999;
    return;
  end if;

  if v_user.monthly_scans_used >= v_limit then
    return query select false, 0;
    return;
  end if;

  update public.users
    set monthly_scans_used = monthly_scans_used + 1
    where id = p_user_id
    returning monthly_scans_used into v_used;

  return query select true, greatest(0, v_limit - v_used);
end;
$$;

create or replace function public.record_session_ping(p_user_id text, p_seconds integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.users
    set total_time_spent_seconds = total_time_spent_seconds + greatest(0, least(p_seconds, 120)),
        last_active_at = now()
    where id = p_user_id;
$$;

revoke all on function public.consume_scan_quota(text) from public, anon, authenticated;
revoke all on function public.record_session_ping(text, integer) from public, anon, authenticated;
grant execute on function public.consume_scan_quota(text) to service_role;
grant execute on function public.record_session_ping(text, integer) to service_role;

commit;
